import { Router } from "express";
import { loginHandler, logoutHandler, meHandler } from "../middlewares/auth";

const router = Router();

router.post("/login", loginHandler);
router.post("/logout", logoutHandler);
router.get("/me", meHandler);

export default router;
