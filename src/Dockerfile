# Dockerfile

# 1. Sử dụng image Node.js 18
FROM node:18-alpine

# 2. Tạo thư mục làm việc
WORKDIR /app

# 3. Sao chép file package.json
COPY package*.json ./

# 4. Cài đặt dependencies cho production
RUN npm ci --only=production

# 5. Sao chép toàn bộ code
COPY . .

# 6. (Không cần Expose vì Railway tự dùng process.env.PORT)

# 7. Lệnh để chạy ứng dụng
CMD [ "npm", "start" ]