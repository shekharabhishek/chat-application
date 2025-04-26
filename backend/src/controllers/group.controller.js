import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io } from "../lib/socket.js";

export const createGroup = async (req, res) => {
  try {
    const { name, description, members } = req.body;
    const admin = req.user._id;

    if (!name) {
      return res.status(400).json({ message: "Group name is required" });
    }

    let imageUrl = "";
    if (req.body.groupImage) {
      const uploadResponse = await cloudinary.uploader.upload(req.body.groupImage);
      imageUrl = uploadResponse.secure_url;
    }

    // Create the new group
    const newGroup = new Group({
      name,
      description,
      admin,
      members: [...members, admin], // Include the admin in members
      groupImage: imageUrl
    });

    await newGroup.save();

    res.status(201).json(newGroup);
  } catch (error) {
    console.log("Error in createGroup controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Find groups where the user is a member
    const groups = await Group.find({ members: userId })
      .populate("admin", "fullName email profilePic")
      .populate("members", "fullName email profilePic");
    
    res.status(200).json(groups);
  } catch (error) {
    console.log("Error in getUserGroups controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const group = await Group.findById(id)
      .populate("admin", "fullName email profilePic")
      .populate("members", "fullName email profilePic");
    
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    
    // Check if user is a member of the group
    if (!group.members.some(member => member._id.toString() === userId.toString())) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }
    
    res.status(200).json(group);
  } catch (error) {
    console.log("Error in getGroupById controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const userId = req.user._id;
    
    const group = await Group.findById(id);
    
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    
    // Check if user is the admin of the group
    if (group.admin.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only admin can update group details" });
    }
    
    let imageUrl = group.groupImage;
    if (req.body.groupImage && req.body.groupImage !== group.groupImage) {
      const uploadResponse = await cloudinary.uploader.upload(req.body.groupImage);
      imageUrl = uploadResponse.secure_url;
    }
    
    group.name = name || group.name;
    group.description = description || group.description;
    group.groupImage = imageUrl;
    
    await group.save();
    
    res.status(200).json(group);
  } catch (error) {
    console.log("Error in updateGroup controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const group = await Group.findById(id);
    
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    
    // Check if user is the admin of the group
    if (group.admin.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only admin can delete the group" });
    }
    
    await Group.findByIdAndDelete(id);
    
    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    console.log("Error in deleteGroup controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const addGroupMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { members } = req.body;
    const userId = req.user._id;
    
    const group = await Group.findById(id);
    
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    
    // Check if user is the admin of the group
    if (group.admin.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only admin can add members" });
    }
    
    // Add members that are not already in the group
    const newMembers = members.filter(
      memberId => !group.members.includes(memberId)
    );
    
    group.members = [...group.members, ...newMembers];
    
    await group.save();
    
    const updatedGroup = await Group.findById(id)
      .populate("admin", "fullName email profilePic")
      .populate("members", "fullName email profilePic");
    
    res.status(200).json(updatedGroup);
  } catch (error) {
    console.log("Error in addGroupMembers controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const removeGroupMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user._id;
    
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    
    // Check if user is the admin of the group
    if (group.admin.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only admin can remove members" });
    }
    
    // Check if trying to remove the admin
    if (memberId === group.admin.toString()) {
      return res.status(400).json({ message: "Cannot remove the admin from the group" });
    }
    
    group.members = group.members.filter(
      member => member.toString() !== memberId
    );
    
    await group.save();
    
    res.status(200).json({ message: "Member removed successfully" });
  } catch (error) {
    console.log("Error in removeGroupMember controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const group = await Group.findById(id);
    
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    
    // Check if user is a member of the group
    if (!group.members.some(member => member.toString() === userId.toString())) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }
    
    // Check if user is the admin
    if (group.admin.toString() === userId.toString()) {
      return res.status(400).json({ message: "Admin cannot leave the group, transfer ownership first or delete the group" });
    }
    
    // Remove user from members array
    group.members = group.members.filter(
      member => member.toString() !== userId.toString()
    );
    
    await group.save();
    
    res.status(200).json({ message: "Left group successfully" });
  } catch (error) {
    console.log("Error in leaveGroup controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Create a group message model
const createGroupMessage = async (groupId, senderId, text, image) => {
  // For now, we're using the Message model but adding special handling for group messages
  // A more complete solution would create a separate GroupMessage model
  return new Message({
    senderId,
    receiverId: groupId, // Using the group ID as the receiver
    text,
    image,
    isGroupMessage: true // Add this field to identify group messages
  });
};

export const getGroupMessages = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user._id;
    
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    
    // Check if user is a member of the group
    if (!group.members.some(member => member.toString() === userId.toString())) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }
    
    // Get all messages where receiverId is the group ID
    const messages = await Message.find({ 
      receiverId: groupId,
      isGroupMessage: true
    }).sort({ createdAt: 1 });
    
    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getGroupMessages controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { text } = req.body;
    const senderId = req.user._id;
    
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    
    // Check if user is a member of the group
    if (!group.members.some(member => member.toString() === senderId.toString())) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }
    
    let imageUrl;
    if (req.body.image) {
      const uploadResponse = await cloudinary.uploader.upload(req.body.image);
      imageUrl = uploadResponse.secure_url;
    }
    
    // Create and save the message
    const newMessage = await createGroupMessage(groupId, senderId, text, imageUrl);
    await newMessage.save();
    
    // Notify all group members about the new message
    io.to(`group:${groupId}`).emit("newGroupMessage", newMessage);
    
    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendGroupMessage controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};