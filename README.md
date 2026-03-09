# Bitespeed Assignment

Backend service that identifies and links customer identities across multiple purchases based on email and phone number.

This project implements the Bitespeed Identity Reconciliation challenge using NestJS, Prisma ORM, and PostgreSQL.

The service exposes an API that receives a customer's email and/or phone number and returns a consolidated identity across all linked contacts.

## Tech Stack

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Prisma Postgres Adapter
- Render (API hosting)

## API Deployment

The API is deployed on Render.

**Endpoint:**
https://bitespeed-identity-cfa1.onrender.com/identify

## API Endpoint

### Identify Contact

**POST /identify**

#### Request Body

```
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```

At least one field must be provided.

#### Example Request

```
POST https://bitespeed-identity-cfa1.onrender.com/identify
{
  "email": "zaid@test.com",
  "phoneNumber": "111111"
}
```

#### Example Response

```
{
  "contact": {
    "primaryContactId": 1,
    "emails": [
      "tausif@test.com",
      "zaid@test.com"
    ],
    "phoneNumbers": [
      "111111"
    ],
    "secondaryContactIds": [2]
  }
}
```

## Identity Resolution Logic

The `/identify` endpoint performs the following steps:

1. **Search Existing Contacts**
   - The service searches contacts where:
     - email = request.email
     - OR phoneNumber = request.phoneNumber

2. **No Existing Contact**
   - If no contacts are found:
     - A new primary contact is created.

3. **Resolve Primary Contact**
   - If contacts exist:
     - The primary contact is identified.
     - If a matched contact is secondary, its parent primary is resolved.

4. **Merge Primary Contacts**
   - If a request links two different identity trees:
     - Example:
       - email belongs to identity A
       - phone belongs to identity B
     - Then:
       - The oldest primary remains primary
       - The newer primary becomes secondary
       - All its linked contacts are reattached to the oldest primary

5. **Create Secondary Contact**
   - If the request introduces new information:
     - Example:
       - Existing:
         - email = a@mail.com
         - phone = 123
       - Request:
         - email = b@mail.com
         - phone = 123
     - A secondary contact is created linked to the primary identity.

6. **Return Consolidated Identity**
   - Response format:
     ```
     {
     "contact": {
       "primaryContactId": number,
       "emails": string[],
       "phoneNumbers": string[],
       "secondaryContactIds": number[]
       }
     }
     ```
