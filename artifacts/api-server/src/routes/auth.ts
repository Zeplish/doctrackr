import { Router } from "express";
import { loginHandler, logoutHandler, meHandler, changeCredentialsHandler } from "../middlewares/auth";

const router = Router();

router.post("/login", loginHandler);
router.post("/logout", logoutHandler);
router.get("/me", meHandler);
router.post("/credentials", changeCredentialsHandler);

export default router;
