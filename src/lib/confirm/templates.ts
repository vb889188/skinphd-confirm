import type { Template } from "./types";

const now = "2026-09-04T20:00:00.000Z";

function source(partial: Omit<Template, "version" | "status" | "approvedAt" | "createdAt" | "requiresWitness" | "sourceFileId">): Template {
  return {
    ...partial,
    version: "1.0",
    status: "approved",
    requiresWitness: true,
    sourceFileId: null,
    approvedAt: now,
    createdAt: now,
  };
}

export const SOURCE_TEMPLATES: Template[] = [
  source({
    id: "tpl-eq-diode-pico",
    name: "Equipment Costs Agreement: Multi Functional Laser Diode & Pico",
    category: "equipment",
    module: "Multi Functional Laser – Diode & Pico",
    sourceFile: "Aesthetic Specialist - Equipent cost agreement - Copy_1.pptx",
    dailyRateRands: null,
    defaultDays: null,
    passPercent: null,
    mandatoryMonths: null,
    hasWaiver: false,
    equipmentLabel: "Multifunctional Diode & Pico laser machine",
    content: `EQUIPMENT COSTS AGREEMENT: MULTI FUNCTIONAL LASER DIODE & PICO

MULTI FUNCTIONAL LASER – DIODE & PICO

This machine must be used in strict accordance with the method of use in the manual, if you use methods other than the instructions in the manual, all the consequences will be your own responsibility, your franchisee does not take any responsibility.

The machine will have an out of box warranty of 7 days from open.

The machine have a 1 year warranty (except for wearing parts), other non warranty scope or over-warranty period. If the instrument fails, it needs to be sent back for repair.

The buyer must bear the shipping cost within six months from the date of purchase.

No warranty service is provided for failures caused by personal reasons of the following:
- Disassemble or modify this product without authorization
- Accidental beatings, falling and causing failures
- Failure due to lack of maintenance
- Failure caused by the correct guidance of the instruction manual

The company assumes no responsibility for damages caused by negligence of the therapist.

ADDITIONAL DESCRIPTION:
It’s recommended that the machine is placed on a trolley available from Limelight. Moving the machine room to room constantly may cause unnecessary damage.

You will be subject to the rules and regulations of the Company for the duration of your employment.

TERMS. By signing this form, I, the employee, acknowledge the equipment above is in working order and that I agree to the following terms:
- The equipment is to be used for company purposes only;
- If the equipment is damaged (excluding normal wear and tear), lost, or stolen, dropped or bumped, I am responsible for any repair or replacement costs;
- Upon termination from the company, I will return the equipment in good working order. If I fail to return the equipment upon termination from the company, or if it is damaged (excluding normal wear and tear), I authorize a payroll deduction to cover any replacements costs the company might incur.

You hereby authorize the Company to deduct any amount payable to the Company, in terms of Clause 4 and 7 of this contract, from your final remuneration and retirement fund benefits, if applicable.

This agreement in no way amends the other terms and conditions of your employment at the Company.

Please sign and return one copy of this agreement to indicate your acceptance of the above conditions.

I, hereby accept the conditions as set out above and agree to abide by them.`,
  }),
  source({
    id: "tpl-eq-oneskin-pen",
    name: "Equipment Costs Agreement: OneSkin Pen",
    category: "equipment",
    module: "OneSkin Pen",
    sourceFile: "Aesthetic Specialist - Equipent cost agreement - Copy_2.pptx",
    dailyRateRands: null,
    defaultDays: null,
    passPercent: null,
    mandatoryMonths: null,
    hasWaiver: false,
    equipmentLabel: "needling machine",
    content: `EQUIPMENT COSTS AGREEMENT: AESTHETIC SPECIALIST

OneSkin Pen

You will be subject to the rules and regulations of the Company for the duration of your employment.

TERMS. By signing this form, I, the employee, acknowledge the equipment above is in working order and that I agree to the following terms:
- The equipment is to be used for company purposes only;
- If the equipment is damaged (excluding normal wear and tear), lost, or stolen, dropped or bumped, I am responsible for any repair or replacement costs;
- Upon termination from the company, I will return the equipment in good working order. If I fail to return the equipment upon termination from the company, or if it is damaged (excluding normal wear and tear), I authorize a payroll deduction to cover any replacements costs the company might incur.

You hereby authorize the Company to deduct any amount payable to the Company, in terms of Clause 4 and 7 of this contract, from your final remuneration and retirement fund benefits, if applicable.

This agreement in no way amends the other terms and conditions of your employment at the Company.

Please sign and return one copy of this agreement to indicate your acceptance of the above conditions.

I, hereby accept the conditions as set out above and agree to abide by them.`,
  }),
  source({
    id: "tpl-eq-hydroderm",
    name: "Equipment Costs Agreement: HydroDerm MD",
    category: "equipment",
    module: "HydroDerm MD",
    sourceFile: "Aesthetic Specialist - Equipent cost agreement - Copy.pptx",
    dailyRateRands: null,
    defaultDays: null,
    passPercent: null,
    mandatoryMonths: null,
    hasWaiver: false,
    equipmentLabel: "HydroDerm MD machine",
    content: `EQUIPMENT COSTS AGREEMENT: HYDRODERM

HYDRODERM MD

This machine must be used in strict accordance with the method of use in the manual, if you use methods other than the instructions in the manual, all the consequences will be your own responsibility, your franchisee does not take any responsibility.

The machine will have an out of box warranty of 7 days from open.

The machine have a 1 year warranty (except for wearing parts), other non warranty scope or over-warranty period. If the instrument fails, it needs to be sent back for repair.

The buyer must bear the shipping cost within six months from the date of purchase.

No warranty service is provided for failures caused by personal reasons of the following:
- Disassemble or modify this product without authorization
- Accidental beatings, falling and causing failures
- Failure due to lack of maintenance
- Failure caused by the correct guidance of the instruction manual

The company assumes no responsibility for damages caused by negligence of the therapist.

ADDITIONAL DESCRIPTION:
It’s recommended that the machine is placed on a trolley available from Limelight. Moving the machine room to room constantly may cause unnecessary damage.

You will be subject to the rules and regulations of the Company for the duration of your employment.

TERMS. By signing this form, I, the employee, acknowledge the equipment above is in working order and that I agree to the following terms:
- The equipment is to be used for company purposes only;
- If the equipment is damaged (excluding normal wear and tear), lost, or stolen, dropped or bumped, I am responsible for any repair or replacement costs;
- Upon termination from the company, I will return the equipment in good working order. If I fail to return the equipment upon termination from the company, or if it is damaged (excluding normal wear and tear), I authorize a payroll deduction to cover any replacements costs the company might incur.

You hereby authorize the Company to deduct any amount payable to the Company, in terms of Clause 4 and 7 of this contract, from your final remuneration and retirement fund benefits, if applicable.

This agreement in no way amends the other terms and conditions of your employment at the Company.

Please sign and return one copy of this agreement to indicate your acceptance of the above conditions.

I, hereby accept the conditions as set out above and agree to abide by them.`,
  }),
  source({
    id: "tpl-tr-aesthetic-therapist",
    name: "Training Costs Agreement: Aesthetic Therapist",
    category: "training",
    module: "SkinPhD Aesthetic Therapist training module",
    sourceFile: "Aesthetic Therapist - Training cost agreement.pptx",
    dailyRateRands: 1000,
    defaultDays: null,
    passPercent: 80,
    mandatoryMonths: 12,
    hasWaiver: false,
    equipmentLabel: null,
    content: `TRAINING COSTS AGREEMENT: Aesthetic Therapist

You have been accepted for:
SKINPHD AESTHETIC THERAPIST training module

The examination will consist of an oral, practical and written evaluation with an 80% minimum pass rate to ensure competency in your role as Aesthetic Therapist for SkinPhD.

The Company reserves the right to withdraw you from the course, should you not attain satisfactory theoretical or practical standards during the duration of the course.

You will be liable for the repayment of the course fee as paid by the Company in the event of:
1. Withdrawing from the course for any reason whatsoever

You will be subject to the rules and regulations of the Company for the duration of the course:
- All tests (theory, verbal questions and practical) pass grade is 80%
- If the therapist results is unsatisfactory (thus not attaining 80% as stated in the above), he/she can be subjected to being dismissed from training for the rest of the training period which will then be followed by disciplinary action in the period following the training if you have already worked in the salon
- Only Somatologists that has a national and/or international qualification will be accepted in the training
- All Aesthetic therapists, Specialists & Experts should study the pre course info, to prepare them for the Sales workshop.

On successful completion of the course, you will be required to remain in the employment of the Company for a period of 12 months (the mandatory period) commencing from the first day of the month following the completion date of the course.

The deemed course fee is R1 000 for the day. Should you decide to leave the employment of the Company prior to the expiry of the mandatory period, you will be liable for the repayment of the course fee due to the Company.

You hereby authorize the Company to deduct any amount payable to the Company, in terms of Clause 4 and 7 of this contract, from your final remuneration and retirement fund benefits, if applicable.

This agreement in no way amends the other terms and conditions of your employment at the Company.

Please sign and return one copy of this agreement to indicate your acceptance of the above conditions.

I, hereby accept the conditions for enrolment for the as set out above and agree to abide by them.`,
  }),
  source({
    id: "tpl-tr-deluxe-massage",
    name: "Training Costs Agreement: Deluxe Massage",
    category: "training",
    module: "Deluxe Massage training module",
    sourceFile: "Deluxe- Training cost agreement.pptx",
    dailyRateRands: 1000,
    defaultDays: null,
    passPercent: 80,
    mandatoryMonths: 12,
    hasWaiver: false,
    equipmentLabel: null,
    content: `TRAINING COSTS AGREEMENT: AESTHETIC THERAPIST

You have been accepted for:
DELUXE MASSAGE training module

The examination will consist of an oral, practical and written evaluation with an 80% minimum pass rate to ensure competency in your role as Aesthetic Therapist for SkinPhD.

The Company reserves the right to withdraw you from the course, should you not attain satisfactory theoretical or practical standards during the duration of the course.

You will be liable for the repayment of the course fee as paid by the Company in the event of:
1. Withdrawing from the course for any reason whatsoever

You will be subject to the rules and regulations of the Company for the duration of the course:
- All new therapists must attend ALL days and pass the training in order to work in SkinPhD salons
- All tests (theory, verbal questions and practical) pass grade is 80%
- If the therapist results within the first couple of days is unsatisfactory (thus not attaining 80% as stated in the above), he/she can be subjected to being dismissed from training for the rest of the training period which will then be followed by disciplinary action in the period following the training if you have already worked in the salon
- Only Somatologists that has a national and/or international qualification will be accepted in the training

On successful completion of the course, you will be required to remain in the employment of the Company for a period of 12 months (the mandatory period) commencing from the first day of the month following the completion date of the course.

The deemed course fee is R1 000 per day. Should you decide to leave the employment of the Company prior to the expiry of the mandatory period, you will be liable for the repayment of the course fee due to the Company.

You hereby authorize the Company to deduct any amount payable to the Company, in terms of Clause 4 and 7 of this contract, from your final remuneration and retirement fund benefits, if applicable.

This agreement in no way amends the other terms and conditions of your employment at the Company.

Please sign and return one copy of this agreement to indicate your acceptance of the above conditions.

I, hereby accept the conditions for enrolment for the as set out above and agree to abide by them.`,
  }),
  source({
    id: "tpl-tr-diode-pico",
    name: "Training Costs Agreement: Diode & Pico Laser",
    category: "training",
    module: "SkinPhD Diode & Pico Laser Training module",
    sourceFile: "Diode & Pico Laser - Training cost agreement.pptx",
    dailyRateRands: 2500,
    defaultDays: null,
    passPercent: 90,
    mandatoryMonths: 18,
    hasWaiver: false,
    equipmentLabel: null,
    content: `TRAINING COSTS AGREEMENT: DIODE & PICO LASER TRAINING

You have been accepted for:
SKINPHD DIODE & PICO LASER TRAINING module

The examination will consist of an oral, practical and written evaluation with an 90% minimum pass rate to ensure competency in your role as SkinPhD Diode & Pico Laser Specialist.

The Company reserves the right to withdraw you from the course, should you not attain satisfactory theoretical or practical standards during the duration of the course.

You will be liable for the repayment of the course fee as paid by the Company in the event of:
1. Withdrawing from the course for any reason whatsoever

You will be subject to the rules and regulations of the Company for the duration of the course:
- All new therapists must attend the day and pass the training in order to work as a SkinPhD Diode & Pico Laser Specialist.
- All tests (theory, verbal questions and practical) pass grade is 90%
- If the results is unsatisfactory (thus not attaining 80% as stated in the above), he/she can be subjected to being dismissed from training for the rest of the training period which will then be followed by disciplinary action in the period following the training if you have already worked in the salon
- Only Somatologists that has passed the STEP 4: Adv. AESTHETIC SPECIALIST training will be accepted in the training.

On successful completion of the course, you will be required to remain in the employment of the Company for a period of 18 months (the mandatory period) commencing from the first day of the month following the completion date of the course.

The deemed course fee is R2 500 per day. Should you decide to leave the employment of the Company prior to the expiry of the mandatory period, you will be liable for the repayment of the course fee due to the Company.

You hereby authorize the Company to deduct any amount payable to the Company, in terms of Clause 4 and 7 of this contract, from your final remuneration and retirement fund benefits, if applicable.

This agreement in no way amends the other terms and conditions of your employment at the Company.

Please sign and return one copy of this agreement to indicate your acceptance of the above conditions.

I, hereby accept the conditions for enrolment for the as set out above and agree to abide by them.`,
  }),
  source({
    id: "tpl-tr-hydroderm",
    name: "Training Costs Agreement: HydroDerm",
    category: "training",
    module: "SkinPhD HydroDerm training module",
    sourceFile: "HYDRODERM - Training cost agreement.pptx",
    dailyRateRands: 1500,
    defaultDays: null,
    passPercent: 80,
    mandatoryMonths: 12,
    hasWaiver: false,
    equipmentLabel: null,
    content: `TRAINING COSTS AGREEMENT: AESTHETIC SPECIALIST

You have been accepted for:
SKINPHD HYDRODERM training module

The examination will consist of an oral, practical and written evaluation with an 80% minimum pass rate to ensure competency in your role as HYDRODERM specialist for SkinPhD.

The Company reserves the right to withdraw you from the course, should you not attain satisfactory theoretical or practical standards during the duration of the course.

You will be liable for the repayment of the course fee as paid by the Company in the event of:
1. Withdrawing from the course for any reason whatsoever

You will be subject to the rules and regulations of the Company for the duration of the course:
- All new therapists must attend the day and pass the training in order to work as a SkinPhD Hydroderm specialist.
- All tests (theory, verbal questions and practical) pass grade is 80%
- If the results is unsatisfactory (thus not attaining 80% as stated in the above), he/she can be subjected to being dismissed from training for the rest of the training period which will then be followed by disciplinary action in the period following the training if you have already worked in the salon
- Only Somatologists that has passed the STEP 2: AESTHETIC SPECIALIST training will be accepted in the training.

On successful completion of the course, you will be required to remain in the employment of the Company for a period of 12 months (the mandatory period) commencing from the first day of the month following the completion date of the course.

The deemed course fee is R1 500 per day. Should you decide to leave the employment of the Company prior to the expiry of the mandatory period, you will be liable for the repayment of the course fee due to the Company.

You hereby authorize the Company to deduct any amount payable to the Company, in terms of Clause 4 and 7 of this contract, from your final remuneration and retirement fund benefits, if applicable.

This agreement in no way amends the other terms and conditions of your employment at the Company.

Please sign and return one copy of this agreement to indicate your acceptance of the above conditions.

I, hereby accept the conditions for enrolment for the as set out above and agree to abide by them.`,
  }),
  source({
    id: "tpl-tr-algae-mn",
    name: "Training Costs Agreement: Intensive Algae Microneedling Peel",
    category: "training",
    module: "STEP 4 Intensive Algae Microneedling Peel",
    sourceFile: "INTENSIVE ALGAE MN-TCA & WAIVER.pptx",
    dailyRateRands: 1500,
    defaultDays: null,
    passPercent: 90,
    mandatoryMonths: 12,
    hasWaiver: true,
    equipmentLabel: null,
    content: `TRAINING COSTS AGREEMENT: ADVANCED AESTHETIC SKIN SPECIALIST

You have been accepted for:
STEP 4: SKINPHD ADVANCED AESTHETIC SKIN SPECIALIST training module
INTENSIVE ALGAE MICRONEEDLING PEEL

The examination will consist of an oral, practical and written evaluation with an 80% minimum pass rate to ensure competency in your role as Aesthetic Therapist for SkinPhD.

The Company reserves the right to withdraw you from the course, should you not attain satisfactory theoretical or practical standards during the duration of the course.

You will be liable for the repayment of the course fee as paid by the Company in the event of:
1. Withdrawing from the course for any reason whatsoever

You will be subject to the rules and regulations of the Company for the duration of the course:
- All new therapists must attend ALL days and pass the training in order to work in SkinPhD salons
- All tests (theory, verbal questions and practical) pass grade is 90%
- If the therapist results within the first couple of days is unsatisfactory (thus not attaining 90% as stated in the above), he/she can be subjected to being dismissed from training for the rest of the training period which will then be followed by disciplinary action in the period following the training if you have already worked in the salon
- Only Somatologists that has passed the STEP 1, STEP2, & STEP 3: AESTHETIC THERAPIST training will be accepted in the training.

On successful completion of the course, you will be required to remain in the employment of the Company for a period of 12 months (the mandatory period) commencing from the first day of the month following the completion date of the course.

The deemed course fee is R1 500 per day. Should you decide to leave the employment of the Company prior to the expiry of the mandatory period, you will be liable for the repayment of the course fee due to the Company.

You hereby authorize the Company to deduct any amount payable to the Company, in terms of Clause 4 and 7 of this contract, from your final remuneration and retirement fund benefits, if applicable.

This agreement in no way amends the other terms and conditions of your employment at the Company.

WAIVER & RELEASE OF LIABILITY ADDENDUM
In consideration of my performance of any treatments that I am not approved for, I expressly agree on behalf of myself that SKINPHD and its directors, and associates, shall not be liable for any damages arising from personal injuries sustained by me, or a client in or on the premises, or as a result of the treatment.

By the execution of this agreement, I accept and take full responsibility for any and all injuries, damages, and losses of any type, which may occur to me or the client and I hereby fully release and discharge the SKINPHD, directors, and associates, from any and all claims, demands, damages, rights of action, or causes of action, present or future, whether the same be known or unknown, anticipated, or unanticipated, resulting from or arising out the use of said treatments.

I expressly agree to indemnify and hold SKINPHD harmless against any and all claims, demands, damages, rights of action, or causes of action, of any person or entity, that may arise from injuries or damages sustained by me or the client. I agree to be solely responsible for the safety and well-being of the client and myself. I understand that SKIN PHD is not required to provide supervision during the performance of the treatments.

I HAVE READ THE FOREGOING WAIVER AND RELEASE OF LIABILITY AND VOLUNTARILY EXECUTED THIS DOCUMENT WITH FULL KNOWLEDGE OF ITS CONTENT.`,
  }),
  source({
    id: "tpl-tr-product-retail",
    name: "Training Costs Agreement: Product & Retail Refresher",
    category: "training",
    module: "Product & Retail Refresher Workshop",
    sourceFile: "Product & Retail refresher - Training cost agreement.pptx",
    dailyRateRands: 800,
    defaultDays: null,
    passPercent: 90,
    mandatoryMonths: 12,
    hasWaiver: false,
    equipmentLabel: null,
    content: `TRAINING COSTS AGREEMENT: PRODUCT & RETAIL REFRESHER WORKSHOP

You have been accepted for:
PRODUCT & RETAIL REFRESHER WORKSHOP training module

The examination will consist of an oral, practical and written evaluation with an 90% minimum pass rate to ensure competency in your role as Aesthetic Specialist for SkinPhD.

The Company reserves the right to withdraw you from the course, should you not attain satisfactory theoretical or practical standards during the duration of the course.

You will be liable for the repayment of the course fee as paid by the Company in the event of:
1. Withdrawing from the course for any reason whatsoever

You will be subject to the rules and regulations of the Company for the duration of the course:
- All tests (theory, verbal questions and practical) pass grade is 90%
- If the therapist results within the first couple of days is unsatisfactory (thus not attaining 90% as stated in the above), he/she can be subjected to being dismissed from training for the rest of the training period which will then be followed by disciplinary action in the period following the training if you have already worked in the salon
- Only Somatologists that has a national and/or international qualification will be accepted in the training
- All Aesthetic therapists, Specialists & Experts should study the pre course info, to prepare them for the Sales workshop.

On successful completion of the course, you will be required to remain in the employment of the Company for a period of 12 months (the mandatory period) commencing from the first day of the month following the completion date of the course.

The deemed course fee is R800 for the day. Should you decide to leave the employment of the Company prior to the expiry of the mandatory period, you will be liable for the repayment of the course fee due to the Company.

You hereby authorize the Company to deduct any amount payable to the Company, in terms of Clause 4 and 7 of this contract, from your final remuneration and retirement fund benefits, if applicable.

This agreement in no way amends the other terms and conditions of your employment at the Company.

Please sign and return one copy of this agreement to indicate your acceptance of the above conditions.

I, hereby accept the conditions for enrolment for the as set out above and agree to abide by them.`,
  }),
  source({
    id: "tpl-tr-sales",
    name: "Training Costs Agreement: Sales Workshop",
    category: "training",
    module: "Sales Workshop training module",
    sourceFile: "Sales workshop - Training cost agreement.pptx",
    dailyRateRands: 1000,
    defaultDays: null,
    passPercent: 90,
    mandatoryMonths: 12,
    hasWaiver: false,
    equipmentLabel: null,
    content: `TRAINING COSTS AGREEMENT: Sales workshop

You have been accepted for:
SALES WORKSHOP training module

The examination will consist of an oral, practical and written evaluation with an 90% minimum pass rate to ensure competency in your role as Aesthetic Specialist for SkinPhD.

The Company reserves the right to withdraw you from the course, should you not attain satisfactory theoretical or practical standards during the duration of the course.

You will be liable for the repayment of the course fee as paid by the Company in the event of:
1. Withdrawing from the course for any reason whatsoever

You will be subject to the rules and regulations of the Company for the duration of the course:
- All tests (theory, verbal questions and practical) pass grade is 90%
- If the therapist results within the first couple of days is unsatisfactory (thus not attaining 90% as stated in the above), he/she can be subjected to being dismissed from training for the rest of the training period which will then be followed by disciplinary action in the period following the training if you have already worked in the salon
- Only Somatologists that has a national and/or international qualification will be accepted in the training
- All Aesthetic therapists, Specialists & Experts should study the pre course info, to prepare them for the Sales workshop.

On successful completion of the course, you will be required to remain in the employment of the Company for a period of 12 months (the mandatory period) commencing from the first day of the month following the completion date of the course.

The deemed course fee is R1 000 for the day. Should you decide to leave the employment of the Company prior to the expiry of the mandatory period, you will be liable for the repayment of the course fee due to the Company.

You hereby authorize the Company to deduct any amount payable to the Company, in terms of Clause 4 and 7 of this contract, from your final remuneration and retirement fund benefits, if applicable.

This agreement in no way amends the other terms and conditions of your employment at the Company.

Please sign and return one copy of this agreement to indicate your acceptance of the above conditions.

I, hereby accept the conditions for enrolment for the as set out above and agree to abide by them.`,
  }),
  source({
    id: "tpl-tr-step4",
    name: "Training Costs Agreement: STEP 4 Advanced Aesthetic Skin Specialist",
    category: "training",
    module: "STEP 4 modules 1–4: Skin in the Modern World, Acne, Hyperpigmentation, Ageing",
    sourceFile: "STEP 4 ADV AESTHETIC SPECIALIST- TCA & WAIVER.pptx",
    dailyRateRands: 1600,
    defaultDays: 4,
    passPercent: 90,
    mandatoryMonths: 18,
    hasWaiver: true,
    equipmentLabel: null,
    content: `TRAINING COSTS AGREEMENT: ADVANCED AESTHETIC SKIN SPECIALIST

You have been accepted for:
STEP 4: SKINPHD ADVANCED AESTHETIC SKIN SPECIALIST training module
MODULE 1: SKIN IN THE MODERN WORLD
MODULE 2: ACNE
MODULE 3: HYPERPIGMENTATION
MODULE 4: AGEING

The examination will consist of an oral, practical and written evaluation with an 90% minimum pass rate to ensure competency in your role as Aesthetic Therapist for SkinPhD.

The Company reserves the right to withdraw you from the course, should you not attain satisfactory theoretical or practical standards during the duration of the course.

You will be liable for the repayment of the course fee as paid by the Company in the event of:
1. Withdrawing from the course for any reason whatsoever

You will be subject to the rules and regulations of the Company for the duration of the course:
- All new therapists must attend ALL days and pass the training in order to work in SkinPhD salons
- All tests (theory, verbal questions and practical) pass grade is 90%
- If the therapist results within the first couple of days is unsatisfactory (thus not attaining 90% as stated in the above), he/she can be subjected to being dismissed from training for the rest of the training period which will then be followed by disciplinary action in the period following the training if you have already worked in the salon
- Only Somatologists that has passed the STEP 1, STEP2, & STEP 3: AESTHETIC THERAPIST training will be accepted in the training.

On successful completion of the course, you will be required to remain in the employment of the Company for a period of 18 months (the mandatory period) commencing from the first day of the month following the completion date of the course.

The deemed course fee over the period of 4 day(s) are R6 400 (R1 600 per day). Should you decide to leave the employment of the Company prior to the expiry of the mandatory period, you will be liable for the repayment of the course fee due to the Company.

You hereby authorize the Company to deduct any amount payable to the Company, in terms of Clause 4 and 7 of this contract, from your final remuneration and retirement fund benefits, if applicable.

This agreement in no way amends the other terms and conditions of your employment at the Company.

WAIVER & RELEASE OF LIABILITY ADDENDUM
In consideration of my performance of any treatments that I am not approved for, I expressly agree on behalf of myself that SKINPHD and its directors, and associates, shall not be liable for any damages arising from personal injuries sustained by me, or a client in or on the premises, or as a result of the treatment.

By the execution of this agreement, I accept and take full responsibility for any and all injuries, damages, and losses of any type, which may occur to me or the client and I hereby fully release and discharge the SKINPHD, directors, and associates, from any and all claims, demands, damages, rights of action, or causes of action, present or future, whether the same be known or unknown, anticipated, or unanticipated, resulting from or arising out the use of said treatments.

I expressly agree to indemnify and hold SKINPHD harmless against any and all claims, demands, damages, rights of action, or causes of action, of any person or entity, that may arise from injuries or damages sustained by me or the client. I agree to be solely responsible for the safety and well-being of the client and myself. I understand that SKIN PHD is not required to provide supervision during the performance of the treatments.

I HAVE READ THE FOREGOING WAIVER AND RELEASE OF LIABILITY AND VOLUNTARILY EXECUTED THIS DOCUMENT WITH FULL KNOWLEDGE OF ITS CONTENT.`,
  }),
  source({
    id: "tpl-tr-dermaplaning",
    name: "Training Costs Agreement: Dermaplaning & Signature Dermaplaning",
    category: "training",
    module: "Dermaplaning & Signature Dermaplaning training module",
    sourceFile: "STEP 5 DErmaplaning- TCA & WAIVER.pptx",
    dailyRateRands: 1500,
    defaultDays: null,
    passPercent: 80,
    mandatoryMonths: 12,
    hasWaiver: true,
    equipmentLabel: null,
    content: `TRAINING COSTS AGREEMENT: Dermaplaning & Signature Dermaplaning

You have been accepted for:
Dermaplaning & Signature Dermaplaning training module

The examination will consist of an oral, practical and written evaluation with an 80% minimum pass rate to ensure competency in your role as Aesthetic Therapist for SkinPhD.

The Company reserves the right to withdraw you from the course, should you not attain satisfactory theoretical or practical standards during the duration of the course.

You will be liable for the repayment of the course fee as paid by the Company in the event of:
1. Withdrawing from the course for any reason whatsoever

You will be subject to the rules and regulations of the Company for the duration of the course:
- All new therapists must attend ALL days and pass the training in order to work in SkinPhD salons
- All tests (theory, verbal questions and practical) pass grade is 80%
- If the therapist results within the first couple of days is unsatisfactory (thus not attaining 80% as stated in the above), he/she can be subjected to being dismissed from training for the rest of the training period which will then be followed by disciplinary action in the period following the training if you have already worked in the salon
- Only Somatologists that has passed the STEP 1, STEP2, & STEP 3: AESTHETIC THERAPIST training will be accepted in the training.

On successful completion of the course, you will be required to remain in the employment of the Company for a period of 12 months (the mandatory period) commencing from the first day of the month following the completion date of the course.

The deemed course fee is R1 500 per day. Should you decide to leave the employment of the Company prior to the expiry of the mandatory period, you will be liable for the repayment of the course fee due to the Company.

You hereby authorize the Company to deduct any amount payable to the Company, in terms of Clause 4 and 7 of this contract, from your final remuneration and retirement fund benefits, if applicable.

This agreement in no way amends the other terms and conditions of your employment at the Company.

WAIVER & RELEASE OF LIABILITY ADDENDUM
In consideration of my performance of any treatments that I am not approved for, I expressly agree on behalf of myself that SKINPHD and its directors, and associates, shall not be liable for any damages arising from personal injuries sustained by me, or a client in or on the premises, or as a result of the treatment.

By the execution of this agreement, I accept and take full responsibility for any and all injuries, damages, and losses of any type, which may occur to me or the client and I hereby fully release and discharge the SKINPHD, directors, and associates, from any and all claims, demands, damages, rights of action, or causes of action, present or future, whether the same be known or unknown, anticipated, or unanticipated, resulting from or arising out the use of said treatments.

I expressly agree to indemnify and hold SKINPHD harmless against any and all claims, demands, damages, rights of action, or causes of action, of any person or entity, that may arise from injuries or damages sustained by me or the client. I agree to be solely responsible for the safety and well-being of the client and myself. I understand that SKIN PHD is not required to provide supervision during the performance of the treatments.

I HAVE READ THE FOREGOING WAIVER AND RELEASE OF LIABILITY AND VOLUNTARILY EXECUTED THIS DOCUMENT WITH FULL KNOWLEDGE OF ITS CONTENT.`,
  }),
];
