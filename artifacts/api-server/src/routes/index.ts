import { Router, type IRouter } from "express";
import healthRouter from "./health";
import organizationRouter from "./organization";
import smtpRouter from "./smtp";
import reminderSettingsRouter from "./reminder-settings";
import studentsRouter from "./students";
import employeesRouter from "./employees";
import documentTypesRouter from "./document-types";
import checklistRouter from "./checklist";
import emailLogsRouter from "./email-logs";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(organizationRouter);
router.use(smtpRouter);
router.use(reminderSettingsRouter);
router.use(studentsRouter);
router.use(employeesRouter);
router.use(documentTypesRouter);
router.use(checklistRouter);
router.use(emailLogsRouter);
router.use(dashboardRouter);

export default router;
