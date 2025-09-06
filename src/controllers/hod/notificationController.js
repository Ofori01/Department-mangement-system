import { Notification, User } from "../../models/index.js";

// Get received notifications
export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, read } = req.query;

    const filter = { receiver_id: req.user._id };

    // Filter by read status
    if (read === "true") {
      filter.read = true;
    } else if (read === "false") {
      filter.read = false;
    }

    const notifications = await Notification.find(filter)
      .populate("sender_id", "name email role")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ sent_at: -1 });

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      receiver_id: req.user._id,
      read: false,
    });

    res.json({
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      _id: notificationId,
      receiver_id: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.read = true;
    await notification.save();

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { receiver_id: req.user._id, read: false },
      { read: true }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Send notification to user(s)
export const sendNotification = async (req, res) => {
  try {
    const { title, message, receiver_id, receiver_ids } = req.body;

    let notifications = [];

    if (receiver_id) {
      // Single recipient
      const receiver = await User.findOne({
        _id: receiver_id,
        department_id: req.user.department_id,
      });

      if (!receiver) {
        return res
          .status(404)
          .json({ message: "Receiver not found in your department" });
      }

      const notification = new Notification({
        title,
        message,
        sender_id: req.user._id,
        receiver_id,
      });

      await notification.save();
      notifications.push(notification);
    } else if (receiver_ids && receiver_ids.length > 0) {
      // Multiple recipients
      const receivers = await User.find({
        _id: { $in: receiver_ids },
        department_id: req.user.department_id,
      });

      if (receivers.length !== receiver_ids.length) {
        return res
          .status(400)
          .json({ message: "Some receivers not found in your department" });
      }

      const notificationDocs = receiver_ids.map((receiverId) => ({
        title,
        message,
        sender_id: req.user._id,
        receiver_id: receiverId,
      }));

      notifications = await Notification.insertMany(notificationDocs);
    } else {
      return res
        .status(400)
        .json({ message: "Please specify receiver_id or receiver_ids" });
    }

    // Populate sender and receiver info
    await Notification.populate(notifications, [
      { path: "sender_id", select: "name email role" },
      { path: "receiver_id", select: "name email role" },
    ]);

    res.status(201).json({
      message: `Notification sent to ${notifications.length} recipient(s)`,
      notifications,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Send notification to all users in department
export const sendDepartmentNotification = async (req, res) => {
  try {
    const { title, message, roles } = req.body;

    // Build filter for users in department
    const userFilter = { department_id: req.user.department_id };

    // Filter by roles if specified
    if (roles && roles.length > 0) {
      userFilter.role = { $in: roles };
    }

    // Exclude the sender
    userFilter._id = { $ne: req.user._id };

    const users = await User.find(userFilter).select("_id");

    if (users.length === 0) {
      return res
        .status(404)
        .json({ message: "No users found to send notification to" });
    }

    const notificationDocs = users.map((user) => ({
      title,
      message,
      sender_id: req.user._id,
      receiver_id: user._id,
    }));

    const notifications = await Notification.insertMany(notificationDocs);

    res.status(201).json({
      message: `Notification sent to ${notifications.length} users in the department`,
      count: notifications.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get sent notifications
export const getSentNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const notifications = await Notification.find({ sender_id: req.user._id })
      .populate("receiver_id", "name email role")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ sent_at: -1 });

    const total = await Notification.countDocuments({
      sender_id: req.user._id,
    });

    res.json({
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get users in department for notification targeting
export const getDepartmentUsers = async (req, res) => {
  try {
    const { role } = req.query;

    const filter = {
      department_id: req.user.department_id,
      _id: { $ne: req.user._id }, // Exclude the sender
    };

    if (role) {
      filter.role = role;
    }

    const users = await User.find(filter)
      .select("name email role studentId")
      .sort({ role: 1, name: 1 });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
