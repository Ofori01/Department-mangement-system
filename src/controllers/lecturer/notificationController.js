import {
  Notification,
  User,
  CourseRegistration,
  CourseAssignment,
} from "../../models/index.js";

// Send notification to student(s) in lecturer's courses
export const sendNotification = async (req, res) => {
  try {
    const { title, message, receiver_id, receiver_ids, course_id } = req.body;

    let notifications = [];

    if (receiver_id) {
      // Single recipient - verify student is in lecturer's course
      if (course_id) {
        const courseAssignment = await CourseAssignment.findOne({
          course_id,
          lecturer_id: req.user._id,
        });

        if (!courseAssignment) {
          return res
            .status(403)
            .json({ message: "You are not assigned to this course" });
        }

        const registration = await CourseRegistration.findOne({
          course_id,
          student_id: receiver_id,
        });

        if (!registration) {
          return res
            .status(404)
            .json({ message: "Student not found in this course" });
        }
      }

      const receiver = await User.findById(receiver_id);
      if (!receiver) {
        return res.status(404).json({ message: "Receiver not found" });
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
      const receivers = await User.find({ _id: { $in: receiver_ids } });

      if (receivers.length !== receiver_ids.length) {
        return res.status(400).json({ message: "Some receivers not found" });
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

// Send notification to all students in a course
export const sendCourseNotification = async (req, res) => {
  try {
    const { title, message, course_id } = req.body;

    // Verify lecturer is assigned to the course
    const courseAssignment = await CourseAssignment.findOne({
      course_id,
      lecturer_id: req.user._id,
    });

    if (!courseAssignment) {
      return res
        .status(403)
        .json({ message: "You are not assigned to this course" });
    }

    // Get all students registered for the course
    const registrations = await CourseRegistration.find({ course_id });

    if (registrations.length === 0) {
      return res
        .status(404)
        .json({ message: "No students found in this course" });
    }

    const notificationDocs = registrations.map((registration) => ({
      title,
      message,
      sender_id: req.user._id,
      receiver_id: registration.student_id,
    }));

    const notifications = await Notification.insertMany(notificationDocs);

    res.status(201).json({
      message: `Notification sent to ${notifications.length} students in the course`,
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
      .populate("receiver_id", "name email role studentId")
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

// Get students in lecturer's courses
export const getCourseStudents = async (req, res) => {
  try {
    const { course_id } = req.query;

    if (course_id) {
      // Get students for specific course
      const courseAssignment = await CourseAssignment.findOne({
        course_id,
        lecturer_id: req.user._id,
      });

      if (!courseAssignment) {
        return res
          .status(403)
          .json({ message: "You are not assigned to this course" });
      }

      const registrations = await CourseRegistration.find({
        course_id,
      }).populate("student_id", "name email studentId level");

      const students = registrations.map((reg) => reg.student_id);
      return res.json({ students });
    } else {
      // Get all students from all lecturer's courses
      const courseAssignments = await CourseAssignment.find({
        lecturer_id: req.user._id,
      });
      const courseIds = courseAssignments.map(
        (assignment) => assignment.course_id
      );

      const registrations = await CourseRegistration.find({
        course_id: { $in: courseIds },
      })
        .populate("student_id", "name email studentId level")
        .populate("course_id", "title code");

      res.json({ registrations });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
