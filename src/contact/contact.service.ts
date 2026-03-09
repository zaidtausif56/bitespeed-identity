import { Injectable } from '@nestjs/common';
import { IdentifyDto } from './dto/identify.dto';

@Injectable()
export class ContactService {
  identify(body: IdentifyDto) {
    return {
      contact: {
        primaryContactId: 0,
        emails: [],
        phoneNumbers: [],
        secondaryContactIds: [],
      },
    };
  }
}
