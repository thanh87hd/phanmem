INSERT INTO users (username, "passwordHash", "fullName", email, "roleId", "isActive", "mustChangePassword", "failedLoginAttempts")
VALUES ('admin', '$2b$12$tOIq2ZjV87GdM5kIr/Aim.LT/poN9snWah7rBMm62Si9bEvQYYR5e', 'Quản trị viên Hệ thống', 'admin@bank.vn', 31, true, false, 0)
ON CONFLICT (username) DO NOTHING;
