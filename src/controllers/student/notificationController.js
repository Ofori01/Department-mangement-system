import { Notification } from "../../models/index.js";

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
