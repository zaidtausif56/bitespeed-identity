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
          email ? { email } : undefined,
          phoneNumber ? { phoneNumber } : undefined,
        ].filter(Boolean) as any,
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

    return {
      message: 'primary contact detected',
      contacts: linkedContacts,
    };
  }
}
