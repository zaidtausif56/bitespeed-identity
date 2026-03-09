import { Body, Controller, Post } from '@nestjs/common';
import { ContactService } from './contact.service';
import { IdentifyDto } from './dto/identify.dto';

@Controller()
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post('identify')
  identify(@Body() body: IdentifyDto) {
    return this.contactService.identify(body);
  }
}
