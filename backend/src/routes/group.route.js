import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
  createGroup, 
  getUserGroups, 
  getGroupById, 
  updateGroup, 
  deleteGroup, 
  addGroupMembers, 
  removeGroupMember, 
  leaveGroup, 
  getGroupMessages, 
  sendGroupMessage 
} from "../controllers/group.controller.js";

const router = express.Router();

// Group management
router.post("/create", protectRoute, createGroup);
router.get("/", protectRoute, getUserGroups);
router.get("/:id", protectRoute, getGroupById);
router.put("/:id", protectRoute, updateGroup);
router.delete("/:id", protectRoute, deleteGroup);

// Group membership
router.post("/:id/members", protectRoute, addGroupMembers);
router.delete("/:groupId/members/:memberId", protectRoute, removeGroupMember);
router.post("/:id/leave", protectRoute, leaveGroup);

// Group messages
router.get("/:id/messages", protectRoute, getGroupMessages);
router.post("/:id/messages", protectRoute, sendGroupMessage);

export default router;