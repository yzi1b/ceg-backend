# CSU Exam God Backend API 文档

> 版本：1.1.0  
> 基础路径：`http://localhost:8088`  
> 协议：HTTP/1.1  
> 数据格式：JSON

---

## 目录

1. [通用说明](#1-通用说明)
2. [认证方式](#2-认证方式)
3. [API 端点](#3-api-端点)
   - 3.1 [用户登录](#31-post-userlogin)
   - 3.2 [用户注册](#32-post-userregister)
   - 3.3 [刷新 Token](#33-post-userrefresh)
   - 3.4 [修改密码](#34-post-userchangepassword)
   - 3.5 [创建课程](#35-post-coursecreate)
   - 3.6 [课程列表](#36-get-courselist)
   - 3.7 [删除课程](#37-delete-courseobject)
   - 3.8 [创建教师账号](#38-post-adminteachercreate)
4. [错误码说明](#4-错误码说明)
5. [数据模型](#5-数据模型)
6. [环境配置](#6-环境配置)

---

## 1. 通用说明

### 1.1 请求头

| 头字段 | 值 | 说明 |
|--------|-----|------|
| `Content-Type` | `application/json` | 请求体 JSON 格式 |

### 1.2 响应结构

成功响应与部分错误响应使用以下统一结构：

```json
{
  "code": 0,         // 状态码，0 表示成功，非 0 表示错误
  "msg": "...",      // 错误时的描述信息
  "token": "...",    // 登录/刷新成功时返回的 JWT
  "accountId": 0     // 注册成功时返回的账号 ID
}
```

> **注意：** 部分参数校验失败时返回空对象 `{}`，HTTP 状态码为 400。

### 1.3 HTTP 状态码说明

| HTTP 状态码 | 说明 |
|-------------|------|
| 200 | 请求成功（业务错误也返回 200，通过 `code` 字段区分） |
| 204 | 操作成功，无响应体 |
| 400 | 请求格式错误（参数缺失、格式非法、或同时提供了互斥参数） |
| 401 | 未认证（Token 缺失、无效或过期） |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 1.4 认证错误响应

```json
{
  "code": -1,
  "msg": "token is not provided, invalid or expired"
}
```

---

## 2. 认证方式

### 2.1 JWT 认证

登录成功后获取 JWT token，后续请求在 `Authorization` 请求头中携带：

```
Authorization: Bearer <token>
```

### 2.2 Token 结构

JWT 由 Header、Payload、Signature 三部分组成，以 `.` 分隔。

**Header：**

```json
{
  "alg": "HS256"
}
```

**Payload：**

```json
{
  "sub": 10000001,       // 用户 accountId
  "name": "johndoe",     // 用户名
  "iat": 1712345678000,  // 签发时间（毫秒时间戳）
  "exp": 1712349278000,  // 过期时间（毫秒时间戳）
  "role": "student"      // 角色
}
```

**签名算法：** HMAC-SHA256

### 2.3 Token 有效期

默认 **1 小时**（3,600,000 毫秒），过期后需重新登录或刷新 Token。

### 2.4 中间件鉴权说明

接口按角色进行访问控制，分为三个等级：

| 等级 | 中间件 | 说明 |
|------|--------|------|
| 公开 | 无 | 无需认证，如登录、注册 |
| 登录 | `authenticate` | 需要有效 JWT Token |
| 授权 | `authenticate` + `authorize(role)` | 需要特定角色权限 |

认证失败返回 `401`，权限不足返回 `403`。

---

## 3. API 端点

### 3.1 POST /user/login

用户登录，通过账户 ID 或用户名进行身份认证。

#### 请求体

```json
{
  "accountId": 10000001,
  "userName": "johndoe",
  "password": "Pass1234"
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `accountId` | integer | 二选一 | 8 位数字账号（与 `userName` 互斥） |
| `userName` | string | 二选一 | 用户名（与 `accountId` 互斥） |
| `password` | string | 是 | 用户密码 |

> **互斥规则：** `accountId` 和 `userName` 必须且只能提供其中一个，同时提供或同时缺失均返回 400。

#### 成功响应（200）

```json
{
  "code": 0,
  "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEwMDAwMDAxLCJuYW1lIjoiYWRtaW4iLCJpYXQiOjE3MTIzNDU2NzgsImV4cCI6MTcxMjM0OTI3OCwicm9sZSI6ImFkbWluIn0.example_signature"
}
```

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 200 | 1 | `account or password is wrong` | 账号或密码错误 |
| 400 | - | `{}` | 参数格式错误 |
| 500 | - | `{}` | 服务器内部错误 |

#### 调用示例

```bash
# 使用 accountId 登录
curl -X POST http://localhost:8088/user/login \
  -H "Content-Type: application/json" \
  -d '{"accountId": 10000001, "password": "Pass1234"}'

# 使用 userName 登录
curl -X POST http://localhost:8088/user/login \
  -H "Content-Type: application/json" \
  -d '{"userName": "johndoe", "password": "Pass1234"}'
```

---

### 3.2 POST /user/register

注册新用户账户，注册成功后自动分配 `student` 角色。

#### 请求体

```json
{
  "userName": "johndoe",
  "password": "Pass1234",
  "fullName": "John Doe",
  "gender": true
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `userName` | string | 是 | 用户名，4-16 个字符，以字母开头，仅允许字母、数字、下划线 |
| `password` | string | 是 | 密码，6-16 个可打印 ASCII 字符，须包含混合字符类别 |
| `fullName` | string | 是 | 真实姓名，2-64 个字符，无前导/尾随空格，无连续空格 |
| `gender` | boolean | 是 | 性别（`true`=男，`false`=女），需显式传递 |

#### 字段校验规则

| 字段 | 正则表达式 | 说明 |
|------|-----------|------|
| `userName` | `/^[A-Za-z][A-Za-z0-9_]{3,15}$/` | 字母开头，4-16 位，仅字母/数字/下划线 |
| `password` | `/^[ -~]{6,16}$/` | 6-16 位可打印 ASCII |
| `password`（强度） | `/^((?=.*[A-Za-z])(?=.*[0-9])|(?=.*[A-Za-z])(?=.*[^A-Za-z0-9])|(?=.*[0-9])(?=.*[^A-Za-z0-9]))[ -~]{6,16}$/` | 须包含至少两种字符类别（字母、数字、符号） |
| `fullName` | `/^(?!.* {2})\S[\S ]{0,62}\S$/` | 2-64 位，无前导/尾随空格，无连续空格 |

#### 成功响应（200）

```json
{
  "code": 0,
  "accountId": 68123457,
  "userName": "johndoe"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | integer | 状态码，0 表示成功 |
| `accountId` | integer | 系统分配的 8 位数字账号（10000000 - 99999999） |
| `userName` | string | 注册的用户名 |

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 200 | 1 | `user name already exists` | 用户名已被占用 |
| 200 | 2 | `password is not strong enough` | 密码强度不足 |
| 400 | - | `{}` | 参数缺失或格式校验不通过 |

#### 调用示例

```bash
curl -X POST http://localhost:8088/user/register \
  -H "Content-Type: application/json" \
  -d '{"userName": "johndoe", "password": "Pass1234", "fullName": "John Doe", "gender": true}'
```

---

### 3.3 POST /user/refresh

刷新当前 JWT Token，签发新的 Token 并延长有效期。

> **需要认证：** 请求头中需携带有效的 `Authorization: Bearer <token>`。

#### 请求体

无（无需请求体）。

#### 成功响应（200）

```json
{
  "code": 0,
  "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEwMDAwMDAxLCJuYW1lIjoiYWRtaW4iLCJpYXQiOjE3MTIzNDU2NzgsImV4cCI6MTcxMjM0OTI3OCwicm9sZSI6ImFkbWluIn0.example_signature"
}
```

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 401 | -1 | `token is not provided, invalid or expired` | Token 缺失、无效或过期 |

#### 调用示例

```bash
curl -X POST http://localhost:8088/user/refresh \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>"
```

---

### 3.4 POST /user/changePassword

修改当前登录用户的密码。

> **需要认证：** 请求头中需携带有效的 `Authorization: Bearer <token>`。

#### 请求体

```json
{
  "oldPassword": "Pass1234",
  "newPassword": "NewPass5678"
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `oldPassword` | string | 是 | 当前密码 |
| `newPassword` | string | 是 | 新密码，6-16 个可打印 ASCII 字符，须包含混合字符类别 |

#### 成功响应（204）

无响应体。

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 200 | 1 | `password is wrong` | 旧密码错误 |
| 200 | 2 | `user does not exist` | 用户不存在 |
| 400 | - | `{}` | 参数缺失或格式校验不通过 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |

#### 调用示例

```bash
curl -X POST http://localhost:8088/user/changePassword \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"oldPassword": "Pass1234", "newPassword": "NewPass5678"}'
```

---

### 3.5 POST /course/create

创建新课程。

> **需要认证：** 教师（`teacher`）及以上角色。

#### 请求体

```json
{
  "title": "高等数学",
  "codeDays": 30
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 课程标题，2-32 个字符，无前导/尾随空格，无连续空格 |
| `codeDays` | integer | 是 | 邀请码有效天数；`0` 表示不生成邀请码，`>0` 表示有效天数 |

#### 成功响应（200）

```json
{
  "id": 92345678
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer | 课程展示 ID（9 位带校验码的 Feistel 加密 ID） |

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失或格式校验不通过 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足（非 teacher） |

#### 调用示例

```bash
curl -X POST http://localhost:8088/course/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title": "高等数学", "codeDays": 30}'
```

---

### 3.6 GET /course/list

获取当前教师创建的所有课程列表。

> **需要认证：** 教师（`teacher`）及以上角色。

#### 查询参数

无。

#### 成功响应（200）

```json
{
  "objects": [
    {
      "id": 92345678,
      "title": "高等数学",
      "inviteCode": "a1b2c3d4e5f6g7h8",
      "inviteCodeExpiresAt": 1712349278000,
      "createdAt": 1712345678000
    }
  ],
  "count": 1
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `objects` | array | 课程摘要数组 |
| `objects[].id` | integer | 课程展示 ID |
| `objects[].title` | string | 课程标题 |
| `objects[].inviteCode` | string/null | 邀请码（16 位十六进制），未生成时为 `null` |
| `objects[].inviteCodeExpiresAt` | integer | 邀请码过期时间（毫秒时间戳），无邀请码时为 `0` |
| `objects[].createdAt` | integer | 创建时间（毫秒时间戳） |
| `count` | integer | 课程数量 |

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足（非 teacher） |

#### 调用示例

```bash
curl -X GET http://localhost:8088/course/list \
  -H "Authorization: Bearer <token>"
```

---

### 3.7 DELETE /course/object

删除指定课程。

> **需要认证：** 教师（`teacher`）及以上角色，且只能删除自己创建的课程。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | integer | 是 | 课程展示 ID（9 位数字） |

#### 成功响应（204）

无响应体。

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失或格式错误 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足（非 teacher） |
| 404 | - | `{}` | 课程不存在 |
| 500 | - | `{}` | 服务器内部错误（含删除不属于自己的课程时返回 403） |

#### 调用示例

```bash
curl -X DELETE "http://localhost:8088/course/object?id=92345678" \
  -H "Authorization: Bearer <token>"
```

---

### 3.8 POST /admin/teacher/create

创建教师账号（管理员专用）。

> **需要认证：** 管理员（`admin`）角色。

#### 请求体

```json
{
  "userName": "teacher1",
  "fullName": "张老师",
  "gender": true
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `userName` | string | 是 | 用户名，4-16 个字符，以字母开头，仅允许字母、数字、下划线 |
| `fullName` | string | 是 | 真实姓名，2-64 个字符，无前导/尾随空格，无连续空格 |
| `gender` | boolean | 是 | 性别（`true`=男，`false`=女） |

#### 成功响应（200）

```json
{
  "code": 0,
  "accountId": 12345678,
  "userName": "teacher1",
  "password": "A1b2C3d4E5f6G7h8"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | integer | 状态码，0 表示成功 |
| `accountId` | integer | 系统分配的 8 位数字账号 |
| `userName` | string | 用户名 |
| `password` | string | 随机生成的初始密码（16 位，含字母、数字、符号） |

> **注意：** 教师账号的初始密码由系统随机生成，返回后请妥善保管。

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 200 | 1 | `user name already exists` | 用户名已被占用 |
| 400 | - | `{}` | 参数缺失或格式校验不通过 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足（非 admin） |

#### 调用示例

```bash
curl -X POST http://localhost:8088/admin/teacher/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"userName": "teacher1", "fullName": "张老师", "gender": true}'
```

---

## 4. 错误码说明

| code | 说明 |
|------|------|
| `0` | 成功（通用） |
| `-1` | 通用错误，无需归类，参照 HTTP 状态码（401/403 等） |

> **业务错误码**（如 `1`、`2` 等）在各接口中含义不同，请以各端点文档中的错误响应表格为准。
>
> 错误码为 `0` 时表示操作成功，非 `0` 时响应中会附带 `msg` 字段说明具体错误原因。

---

## 5. 数据模型

### 5.1 用户（User）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer | 自增主键 |
| `account_id` | integer | 8 位数字账号，唯一 |
| `user_name` | varchar(16) | 用户名，唯一 |
| `password_hash` | varchar(64) | scrypt 哈希值 |
| `password_salt` | varchar(32) | scrypt 盐值 |
| `role` | varchar(16) | 角色：`student` / `teacher` / `admin` |
| `full_name` | varchar(64) | 真实姓名 |
| `gender` | boolean | 性别 |
| `created_at` | timestamp | 创建时间 |
| `updated_at` | timestamp | 更新时间 |

### 5.2 课程（Course）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer | 自增主键 |
| `title` | varchar(32) | 课程标题 |
| `owner` | integer | 创建者用户 ID（外键关联 User） |
| `invite_code` | varchar(16) | 邀请码（唯一），可为 `null` |
| `invite_code_expires_at` | timestamp | 邀请码过期时间，可为 `null` |
| `created_at` | timestamp | 创建时间 |
| `updated_at` | timestamp | 更新时间 |

### 5.3 邀请码（InviteCode）

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | varchar(16) | 16 位随机十六进制字符串 |
| `expiresAt` | timestamp | 过期时间 |
| 有效期 | - | 默认 7 天（可通过 `codeDays` 参数自定义） |

### 5.4 角色枚举

| 角色 | 值 | 说明 |
|------|-----|------|
| 学生 | `student` | 注册默认角色 |
| 教师 | `teacher` | 通过管理员创建 |
| 管理员 | `admin` | 系统初始化时通过环境变量创建 |

### 5.5 展示 ID（DisplayableId）

展示 ID 是对自增主键进行 Feistel 加密后附加校验码生成的 9 位数字，用于对外暴露时隐藏真实主键。

- **算法：** Feistel 网络（8 轮），HMAC-SHA256 作为轮函数
- **校验码：** 加权和模 9 加 1，置于最高位
- **格式：** `C + encrypted(8位)` → 共 9 位数字
- **密钥：** 通过环境变量 `DISPLAY_ID_KEY` 配置

### 5.6 密码加密

- **算法：** scrypt（随机 16 字节盐值，32 字节密钥长度）
- **密码比较：** 使用 `timingSafeEqual` 防止时序攻击

### 5.7 数据库表

| 表名 | 说明 | 创建时机 |
|------|------|---------|
| `users` | 用户表 | 启动时自动创建 |
| `courses` | 课程表 | 启动时自动创建 |
| `course_members` | 课程成员表 | 启动时自动创建 |
| `exams` | 考试表 | 启动时自动创建 |
| `papers` | 试卷表 | 启动时自动创建 |
| `submissions` | 提交记录表 | 启动时自动创建 |

---

## 6. 环境配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `WEB_PORT` | `8088` | 服务器端口 |
| `DB_HOST` | `localhost` | 数据库主机 |
| `DB_PORT` | `5432` | 数据库端口 |
| `DB_NAME` | `ceg` | 数据库名称 |
| `DB_USER` | `ceg_backend` | 数据库用户 |
| `DB_PASSWORD` | `password` | 数据库密码 |
| `ADMIN_DEFAULT_NAME` | `admin` | 默认管理员用户名 |
| `ADMIN_DEFAULT_PASSWORD` | `admin@ceg` | 默认管理员密码 |
| `JWT_SECRET` | `ceg_jwt_secret_key_2024` | JWT 签名密钥 |
| `DISPLAY_ID_KEY` | - | **必填**，Feistel 加密密钥，用于生成展示 ID |
