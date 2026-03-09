import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IdentifyDto } from './dto/identify.dto';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  async identify(body: IdentifyDto) {
    const { email, phoneNumber } = body;

    // Step 1: find contacts matching email or phone
    const contacts = await this.prisma.contact.findMany({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phoneNumber ? [{ phoneNumber }] : []),
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Step 2: if no contacts exist → create primary
    if (contacts.length === 0) {
      const newPrimary = await this.prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: 'primary',
        },
      });

      return {
        contact: {
          primaryContactId: newPrimary.id,
          emails: email ? [email] : [],
          phoneNumbers: phoneNumber ? [phoneNumber] : [],
          secondaryContactIds: [],
        },
      };
    }

    // Step 3: determine primary contact
    let primaryContact =
      contacts.find((c) => c.linkPrecedence === 'primary') ?? contacts[0];

    if (primaryContact.linkedId) {
      const linkedPrimary = await this.prisma.contact.findUnique({
        where: { id: primaryContact.linkedId },
      });

      if (linkedPrimary) {
        primaryContact = linkedPrimary;
      }
    }

    // Step 4: fetch all contacts linked to this primary
    const linkedContacts = await this.prisma.contact.findMany({
      where: {
        OR: [{ id: primaryContact.id }, { linkedId: primaryContact.id }],
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Step 5: collect existing emails and phone numbers
    const emails = new Set(linkedContacts.map((c) => c.email).filter(Boolean));
    const phoneNumbers = new Set(
      linkedContacts.map((c) => c.phoneNumber).filter(Boolean),
    );

    let newSecondary = null;

    // Step 6: create secondary contact if new info appears
    if (
      (email && !emails.has(email)) ||
      (phoneNumber && !phoneNumbers.has(phoneNumber))
    ) {
      newSecondary = await this.prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: 'secondary',
          linkedId: primaryContact.id,
        },
      });

      linkedContacts.push(newSecondary);

      if (email) emails.add(email);
      if (phoneNumber) phoneNumbers.add(phoneNumber);
    }

    // Step 7: build response
    return {
      contact: {
        primaryContactId: primaryContact.id,
        emails: Array.from(emails),
        phoneNumbers: Array.from(phoneNumbers),
        secondaryContactIds: linkedContacts
          .filter((c) => c.linkPrecedence === 'secondary')
          .map((c) => c.id),
      },
    };
  }
}
