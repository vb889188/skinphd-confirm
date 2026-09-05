# SkinPhD Confirm — client production server

Hand this to the operator who will host the private server.

## What the server does

SkinPhD Confirm issues employee training and equipment agreements from SkinPhD source forms, freezes the wording, collects employee / franchisee / witness typed signatures, and stores the snapshot hash in the SkinPhD Supabase tenant.

It does **not** decide competence, treatment authorisation, payroll deductions, or client consent.

## Included source forms

Equipment: Multi Functional Laser Diode & Pico, OneSkin Pen, HydroDerm MD.

Training: Aesthetic Therapist, Deluxe Massage, Diode & Pico Laser, HydroDerm, Intensive Algae Microneedling Peel, Product & Retail Refresher, Sales Workshop, STEP 4 Advanced Aesthetic Skin Specialist, Dermaplaning & Signature Dermaplaning.

Waiver addendums stay attached to the source forms that already include them. They are employee addendums, not client treatment consent.

## Run on the private server

```bash
docker compose up --build -d
```

The app listens on port 8080. Put HTTPS in front of it. Do not publish it on the open internet.

Without Docker:

```bash
npm ci
npm run build:server
HOST=0.0.0.0 PORT=8080 npm start
```

## First sign-in

The franchisee signs in with the issued email and PIN, then changes the PIN under Settings. Add real staff in People. Do not store live ID numbers until SkinPhD legal has approved the source wording.

## Still required from SkinPhD

- Approval of source wording, including 80%/90% mismatches and payroll-deduction sentences
- Confirmation that typed-name signatures are accepted for v1
- Remaining clinic names, if any
