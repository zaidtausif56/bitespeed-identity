import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IdentifyDto } from './dto/identify.dto';
import { Contact } from '../../generated/prisma/client';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  async identify(body: IdentifyDto) {
    const { email, phoneNumber } = body;

    // Step 1: find all contacts that match either email or phone number
    const contacts = await this.findMatchingContacts(email, phoneNumber);

    // Step 2: if no contacts exist, create a new primary contact
    if (contacts.length === 0) {
      return this.createPrimary(email, phoneNumber);
    }

    // Step 3: determine the primary contact from the matched contacts
    let primaryContact = await this.resolvePrimaryContact(contacts);

    // Step 4: merge identities if multiple primary contacts exist
    primaryContact = await this.mergePrimaries(contacts, primaryContact);

    // Step 5: fetch all contacts linked to the resolved primary contact
    const linkedContacts = await this.fetchLinkedContacts(primaryContact.id);

    // Step 6: create a secondary contact if the request contains new information
    const updatedContacts = await this.createSecondaryIfNeeded(
      linkedContacts,
      primaryContact.id,
      email,
      phoneNumber,
    );

    // Step 7: build the final response format
    return this.buildResponse(primaryContact.id, updatedContacts);
  }

  private async findMatchingContacts(
    email?: string,
    phoneNumber?: string,
  ): Promise<Contact[]> {
    return this.prisma.contact.findMany({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phoneNumber ? [{ phoneNumber }] : []),
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async createPrimary(email?: string, phoneNumber?: string) {
    const contact = await this.prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: 'primary',
      },
    });

    return {
      contact: {
        primaryContactId: contact.id,
        emails: email ? [email] : [],
        phoneNumbers: phoneNumber ? [phoneNumber] : [],
        secondaryContactIds: [],
      },
    };
  }

  private async resolvePrimaryContact(contacts: Contact[]): Promise<Contact> {
    let primary =
      contacts.find((c) => c.linkPrecedence === 'primary') ?? contacts[0];

    if (primary.linkedId) {
      const parent = await this.prisma.contact.findUnique({
        where: { id: primary.linkedId },
      });

      if (parent) primary = parent;
    }

    return primary;
  }

  private async mergePrimaries(
    contacts: Contact[],
    currentPrimary: Contact,
  ): Promise<Contact> {
    const primaryIds = new Set<number>();

    for (const c of contacts) {
      if (c.linkPrecedence === 'primary') primaryIds.add(c.id);
      else if (c.linkedId) primaryIds.add(c.linkedId);
    }

    const primaries = await this.prisma.contact.findMany({
      where: { id: { in: Array.from(primaryIds) } },
      orderBy: { createdAt: 'asc' },
    });

    if (primaries.length <= 1) return currentPrimary;

    const oldest = primaries[0];
    const others = primaries.slice(1);

    for (const p of others) {
      await this.prisma.contact.update({
        where: { id: p.id },
        data: {
          linkPrecedence: 'secondary',
          linkedId: oldest.id,
        },
      });

      await this.prisma.contact.updateMany({
        where: { linkedId: p.id },
        data: { linkedId: oldest.id },
      });
    }

    return oldest;
  }

  private async fetchLinkedContacts(primaryId: number): Promise<Contact[]> {
    return this.prisma.contact.findMany({
      where: {
        OR: [{ id: primaryId }, { linkedId: primaryId }],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async createSecondaryIfNeeded(
    contacts: Contact[],
    primaryId: number,
    email?: string,
    phoneNumber?: string,
  ): Promise<Contact[]> {
    const emails = new Set(
      contacts.map((c) => c.email).filter((v): v is string => Boolean(v)),
    );

    const phones = new Set(
      contacts.map((c) => c.phoneNumber).filter((v): v is string => Boolean(v)),
    );

    if (
      (email && !emails.has(email)) ||
      (phoneNumber && !phones.has(phoneNumber))
    ) {
      const secondary = await this.prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: 'secondary',
          linkedId: primaryId,
        },
      });

      contacts.push(secondary);
    }

    return contacts;
  }

  private buildResponse(primaryId: number, contacts: Contact[]) {
    const emails = new Set<string>();
    const phones = new Set<string>();
    const secondaryIds: number[] = [];

    for (const c of contacts) {
      if (c.email) emails.add(c.email);
      if (c.phoneNumber) phones.add(c.phoneNumber);
      if (c.linkPrecedence === 'secondary') secondaryIds.push(c.id);
    }

    return {
      contact: {
        primaryContactId: primaryId,
        emails: Array.from(emails),
        phoneNumbers: Array.from(phones),
        secondaryContactIds: secondaryIds,
      },
    };
  }
}
