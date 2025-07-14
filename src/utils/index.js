// src/utils/index.js

const handleError = (res, error) => {
    console.error(error);
    res.status(500).json({ message: 'An error occurred', error: error.message });
};

const validateHodData = (data) => {
    const { name, department, email } = data;
    if (!name || !department || !email) {
        return { valid: false, message: 'Name, department, and email are required.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, message: 'Invalid email format.' };
    }
    return { valid: true };
};

export default {
    handleError,
    validateHodData,
};