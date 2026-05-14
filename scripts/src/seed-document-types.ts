import { db } from "@workspace/db";
import {
  documentTypesTable,
  checklistItemsTable,
  studentsTable,
  employeesTable,
} from "@workspace/db";

const studentDocTypes = [
  {
    name: "Medical Examination Form",
    category: "student" as const,
    isActive: true,
    isRequired: true,
    templateFormUrl:
      "https://drive.google.com/uc?export=download&id=1L0c_xGLtSLmVkTdlUSqjnWzuu3QpMuJx",
  },
  {
    name: "Daycare Cumulative Health Record",
    category: "student" as const,
    isActive: true,
    isRequired: true,
    templateFormUrl:
      "https://drive.google.com/uc?export=download&id=1zO2iSQ65T93ygY22-MGHWbFmYqeAkUaY",
  },
];

const employeeDocTypeNames = [
  "Resume",
  "3 Reference Letters",
  "State Central Registry (SCR) Clearance",
  "DOH Fingerprint Clearance",
  "DOE Fingerprint Clearance",
  "DOH Clearance Letter",
  "DOH Approval Request",
  "Diploma",
  "Medical Form",
  "Child Abuse Identification & Reporting",
  "Infection Control",
  "Foundation in Health and Safety",
  "Shaken Baby Syndrome Training",
  "Sudden Infant Death Syndrome (SIDS) Training",
  "Behavior Management Training",
  "Family Engagement",
  "Supervision of Children",
  "Preventing Lead Poisoning",
  "Autoinjector",
  "Food Handler Certification",
  "Obesity Prevention",
  "Emergency Preparedness",
  "Transportation",
  "Expulsion & Suspension Prevention Strategies",
  "Legally Exempt Child Care Training",
  "Supporting Language Development: Birth to 5",
  "ACEs & Trauma-Informed Practice",
  "Supporting Children with Special Needs",
  "CPR & First Aid Certification",
  "Sexual Harassment Training",
  "W-2 Form",
];

const employeeDocTypes = employeeDocTypeNames.map((name) => ({
  name,
  category: "employee" as const,
  isActive: true,
  isRequired: true,
  templateFormUrl: null,
}));

async function main() {
  console.log("Starting document type seed...");

  console.log("Clearing checklist items...");
  await db.delete(checklistItemsTable);

  console.log("Clearing document types...");
  await db.delete(documentTypesTable);

  console.log("Inserting student document types...");
  const insertedStudentDts = await db
    .insert(documentTypesTable)
    .values(studentDocTypes)
    .returning();
  console.log(`  Inserted ${insertedStudentDts.length} student document types`);

  console.log("Inserting employee document types...");
  const insertedEmployeeDts = await db
    .insert(documentTypesTable)
    .values(employeeDocTypes)
    .returning();
  console.log(`  Inserted ${insertedEmployeeDts.length} employee document types`);

  const students = await db.select().from(studentsTable);
  if (students.length > 0) {
    const studentChecklist = students.flatMap((s) =>
      insertedStudentDts.map((dt) => ({
        personType: "student" as const,
        studentId: s.id,
        documentTypeId: dt.id,
      }))
    );
    await db.insert(checklistItemsTable).values(studentChecklist);
    console.log(
      `Regenerated ${studentChecklist.length} checklist items for ${students.length} students`
    );
  }

  const employees = await db.select().from(employeesTable);
  if (employees.length > 0) {
    const employeeChecklist = employees.flatMap((e) =>
      insertedEmployeeDts.map((dt) => ({
        personType: "employee" as const,
        employeeId: e.id,
        documentTypeId: dt.id,
      }))
    );
    await db.insert(checklistItemsTable).values(employeeChecklist);
    console.log(
      `Regenerated ${employeeChecklist.length} checklist items for ${employees.length} employees`
    );
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
