# CSU Exam God Backend API 文档

> 版本：1.6.0  
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
   - 3.5 [查看用户信息](#35-get-userobject)
   - 3.6 [更新用户信息](#36-post-userobject)
   - 3.7 [创建课程](#37-post-coursecreate)
   - 3.8 [课程列表](#38-get-courselist)
   - 3.9 [管理邀请码](#39-post-coursecode)
   - 3.10 [加入课程](#310-get-coursejoin)
   - 3.11 [退出课程](#311-delete-coursequit)
   - 3.12 [踢出学生](#312-delete-coursestudent)
   - 3.13 [删除课程](#313-delete-courseobject)
   - 3.14 [创建考试](#314-post-examcreate)
   - 3.15 [考试列表](#315-get-examlist)
   - 3.16 [考试详情](#316-get-examobject)
   - 3.17 [修改考试](#317-post-examobject)
   - 3.18 [删除考试](#318-delete-examobject)
   - 3.19 [切换考试阶段](#319-post-examstage)
   - 3.20 [创建试卷](#320-post-papercreate)
   - 3.21 [试卷列表](#321-get-paperlist)
   - 3.22 [试卷详情](#322-get-paperobject)
   - 3.23 [保存试卷内容](#323-post-paperobject)
   - 3.24 [创建教师账号](#324-post-adminteachercreate)
   - 3.25 [用户列表](#325-get-adminuserlist)
   - 3.26 [重置密码](#326-get-adminuserpassword)
   - 3.27 [开始考试](#327-get-examtake)
   - 3.28 [提交作答](#328-post-examsubmit)
   - 3.29 [开始评分](#329-get-papergradestart)
   - 3.30 [评分概览](#330-get-papergradetasks)
   - 3.31 [下一份评分](#331-get-papergradenext)
   - 3.32 [提交评分](#332-post-papergradescore)
   - 3.33 [完成评分](#333-get-papergradefinish)
   - 3.34 [我的主页](#334-get-my)
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

### 3.4 POST /user/password

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
curl -X POST http://localhost:8088/user/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"oldPassword": "Pass1234", "newPassword": "NewPass5678"}'
```

---

### 3.5 GET /user/object

查看用户个人信息。管理员可查看任意用户；课程教师可查看自己课程中的学生；用户可查看本人信息。

> **需要认证：** 需登录。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | integer | 是 | 用户账号 ID（8 位数字） |

#### 权限说明

| 角色 | 可查看范围 |
|------|-----------|
| `admin` | 任意用户 |
| `teacher` | 自己课程中的学生 |
| 本人 | 自己的信息 |

#### 成功响应（200）

```json
{
  "code": 0,
  "object": {
    "accountId": 10000001,
    "userName": "johndoe",
    "role": "student",
    "fullName": "John Doe",
    "gender": true,
    "createdAt": 1712345678000
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `object.accountId` | integer | 8 位数字账号 |
| `object.userName` | string | 用户名 |
| `object.role` | string | 角色：`student` / `teacher` / `admin` |
| `object.fullName` | string | 真实姓名 |
| `object.gender` | boolean | 性别 |
| `object.createdAt` | integer | 创建时间（毫秒时间戳） |

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失或格式错误 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足（非管理员、非课程教师、非本人） |
| 404 | - | `{}` | 用户不存在 |
| 500 | - | `{}` | 服务器内部错误 |

#### 调用示例

```bash
curl -X GET "http://localhost:8088/user/object?id=10000001" \
  -H "Authorization: Bearer <token>"
```

---

### 3.6 POST /user/object

更新用户个人信息（姓名、性别）。管理员可更新任意用户；用户可更新本人信息。

> **需要认证：** 需登录。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | integer | 是 | 用户账号 ID（8 位数字） |

#### 请求体

```json
{
  "fullName": "张三",
  "gender": true
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `fullName` | string | 否 | 真实姓名，2-64 个字符，无前导/尾随空格，无连续空格 |
| `gender` | boolean | 否 | 性别（`true`=男，`false`=女） |

至少需提供一项可修改字段。

#### 权限说明

| 角色 | 可更新范围 |
|------|-----------|
| `admin` | 任意用户 |
| 本人 | 自己的信息 |

#### 成功响应（200）

```json
{
  "code": 0,
  "object": {
    "accountId": 10000001,
    "userName": "johndoe",
    "role": "student",
    "fullName": "张三",
    "gender": true,
    "createdAt": 1712345678000
  }
}
```

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失、格式校验不通过或未提供可更新字段 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足（非管理员且非本人） |
| 404 | - | `{}` | 用户不存在 |
| 500 | - | `{}` | 服务器内部错误 |

#### 调用示例

```bash
curl -X POST "http://localhost:8088/user/object?id=10000001" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"fullName": "张三", "gender": true}'
```

---

### 3.7 POST /course/create

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

### 3.8 GET /course/list

获取当前用户的课程列表。教师返回自己创建的课程，学生返回自己加入的课程。

> **需要认证：** 需登录。

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

#### 调用示例

```bash
# 教师查看自己创建的课程
curl -X GET http://localhost:8088/course/list \
  -H "Authorization: Bearer <token>"

# 学生查看自己加入的课程
curl -X GET http://localhost:8088/course/list \
  -H "Authorization: Bearer <token>"
```

---

### 3.9 POST /course/code

刷新或关闭课程邀请码。

> **需要认证：** 管理员（`admin`）或课程所有者（`teacher`）。

#### 请求体

```json
{
  "courseId": 92345678,
  "codeDays": 30
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `courseId` | integer | 是 | 课程展示 ID（9 位数字） |
| `codeDays` | integer | 是 | 有效天数；`>0` 刷新邀请码，`0` 关闭邀请码 |

#### 行为说明

| codeDays | 行为 |
|----------|------|
| `> 0` | 生成新的邀请码，有效期为当前时间 + codeDays 天 |
| `0` | 关闭邀请码，将其置为 null |

#### 成功响应（200）

```json
{
  "code": 0,
  "object": {
    "id": 92345678,
    "title": "高等数学",
    "inviteCode": "a1b2c3d4e5f6g7h8",
    "inviteCodeExpiresAt": 1712349278000,
    "createdAt": 1712345678000
  }
}
```

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失或格式校验不通过 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足（非 admin 或非本课程教师） |
| 404 | - | `{}` | 课程不存在 |
| 500 | - | `{}` | 服务器内部错误 |

#### 调用示例

```bash
# 刷新邀请码（30 天有效）
curl -X POST http://localhost:8088/course/code \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"courseId": 92345678, "codeDays": 30}'

# 关闭邀请码
curl -X POST http://localhost:8088/course/code \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"courseId": 92345678, "codeDays": 0}'
```

---

### 3.10 GET /course/join

学生使用邀请码加入课程。

> **需要认证：** 学生（`student`）角色。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | string | 是 | 16 位邀请码 |

#### 成功响应（200）

```json
{
  "code": 0,
  "object": {
    "id": 92345678,
    "title": "高等数学",
    "inviteCode": "a1b2c3d4e5f6g7h8",
    "inviteCodeExpiresAt": 1712349278000,
    "createdAt": 1712345678000
  }
}
```

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 200 | 1 | `invite code is invalid or expired` | 邀请码无效或已过期 |
| 200 | 2 | `you are already a member of this course` | 已经在该课程中 |
| 400 | - | `{}` | 参数缺失或格式错误 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足（非 student） |
| 500 | - | `{}` | 服务器内部错误 |

#### 调用示例

```bash
curl -X GET "http://localhost:8088/course/join?code=a1b2c3d4e5f6g7h8" \
  -H "Authorization: Bearer <token>"
```

---

### 3.11 DELETE /course/quit

学生退出课程。

> **需要认证：** 学生（`student`）角色。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | integer | 是 | 课程展示 ID（9 位数字） |

#### 成功响应（200）

```json
{
  "code": 0
}
```

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 200 | 1 | `you are not a member of this course` | 不在该课程中 |
| 400 | - | `{}` | 参数缺失或格式错误 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足（非 student） |
| 404 | - | `{}` | 课程不存在 |
| 500 | - | `{}` | 服务器内部错误 |

#### 调用示例

```bash
curl -X DELETE "http://localhost:8088/course/quit?id=92345678" \
  -H "Authorization: Bearer <token>"
```

---

### 3.12 DELETE /course/student

管理员或课程所有者将学生踢出课程。

> **需要认证：** 管理员（`admin`）或课程所有者（`teacher`）。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | integer | 是 | 课程展示 ID（9 位数字） |
| `studentId` | integer | 是 | 学生账号 ID（8 位数字） |

#### 成功响应（200）

```json
{
  "code": 0
}
```

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 200 | 1 | `cannot kick yourself` | 不能将自己踢出课程 |
| 200 | 2 | `student is not in this course` | 学生不在该课程中 |
| 400 | - | `{}` | 参数缺失或格式错误 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足（非 admin 或非本课程教师） |
| 404 | - | `{}` | 课程不存在 |
| 500 | - | `{}` | 服务器内部错误 |

#### 调用示例

```bash
curl -X DELETE "http://localhost:8088/course/student?id=92345678&studentId=10000001" \
  -H "Authorization: Bearer <token>"
```

---

### 3.13 DELETE /course/object

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

### 3.14 POST /exam/create

创建新考试。

> **需要认证：** 教师（`teacher`）及以上角色，且只能在自己创建的课程下创建。

#### 请求体

```json
{
  "courseId": 92345678,
  "title": "期中考试",
  "full": 100,
  "startsAt": 1712345678000,
  "endsAt": 1712432078000,
  "duration": 120
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `courseId` | integer | 是 | 课程展示 ID（9 位数字） |
| `title` | string | 是 | 考试标题，2-32 个字符，无前导/尾随空格，无连续空格 |
| `full` | integer | 是 | 总分 |
| `startsAt` | integer | 是 | 开始时间（毫秒时间戳） |
| `endsAt` | integer | 是 | 结束时间（毫秒时间戳） |
| `duration` | integer | 是 | 考试时长（分钟） |

#### 成功响应（200）

```json
{
  "code": 0,
  "id": 19345678
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer | 考试展示 ID（9 位带校验码的 Feistel 加密 ID） |

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失或格式校验不通过 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足（非 teacher） |
| 404 | - | `{}` | 课程不存在 |
| 500 | - | `{}` | 服务器内部错误 |

#### 调用示例

```bash
curl -X POST http://localhost:8088/exam/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"courseId": 92345678, "title": "期中考试", "full": 100, "startsAt": 1712345678000, "endsAt": 1712432078000, "duration": 120}'
```

---

### 3.15 GET /exam/list

获取指定课程下的所有考试列表。

> **需要认证：** 需登录。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `courseId` | integer | 是 | 课程展示 ID（9 位数字） |

#### 成功响应（200）

```json
{
  "code": 0,
  "objects": [
    {
      "id": 19345678,
      "courseId": 92345678,
      "title": "期中考试",
      "full": 100,
      "stage": "preparing",
      "startsAt": 1712345678000,
      "endsAt": 1712432078000,
      "duration": 120,
      "createdAt": 1712345678000
    }
  ],
  "count": 1
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `objects` | array | 考试摘要数组 |
| `objects[].id` | integer | 考试展示 ID |
| `objects[].courseId` | integer | 所属课程 ID |
| `objects[].title` | string | 考试标题 |
| `objects[].full` | integer | 总分 |
| `objects[].stage` | string | 阶段：`preparing` / `opening` / `grading` / `archived` |
| `objects[].startsAt` | integer | 开始时间（毫秒时间戳） |
| `objects[].endsAt` | integer | 结束时间（毫秒时间戳） |
| `objects[].duration` | integer | 考试时长（分钟） |
| `objects[].createdAt` | integer | 创建时间（毫秒时间戳） |
| `count` | integer | 考试数量 |

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失或格式错误 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 500 | - | `{}` | 服务器内部错误 |

#### 调用示例

```bash
curl -X GET "http://localhost:8088/exam/list?courseId=92345678" \
  -H "Authorization: Bearer <token>"
```

---

### 3.16 GET /exam/object

获取指定考试的详细信息。

> **需要认证：** 需登录。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | integer | 是 | 考试展示 ID（9 位数字） |

#### 成功响应（200）

```json
{
  "code": 0,
  "object": {
    "id": 19345678,
    "courseId": 92345678,
    "title": "期中考试",
    "full": 100,
    "stage": "preparing",
    "startsAt": 1712345678000,
    "endsAt": 1712432078000,
    "duration": 120,
    "createdAt": 1712345678000
  }
}
```

学生身份调用时，响应额外包含以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `score` | integer | 考试成绩，未归档或无提交时返回 `-1` |
| `status` | string | 参与状态：`not_taken`（未参考）/ `in_progress`（一开始）/ `submitted`（已提交） |

```json
{
  "code": 0,
  "object": {
    "id": 19345678,
    "title": "期中考试",
    "stage": "archived",
    "score": 85,
    "status": "submitted",
    ...
  }
}
```

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失或格式错误 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 404 | - | `{}` | 考试不存在 |
| 500 | - | `{}` | 服务器内部错误 |

#### 调用示例

```bash
curl -X GET "http://localhost:8088/exam/object?id=19345678" \
  -H "Authorization: Bearer <token>"
```

---

### 3.17 POST /exam/object

修改考试信息。仅当考试处于 `preparing` 阶段时可修改，否则只能删除。

> **需要认证：** 教师（`teacher`）及以上角色，且只能修改自己课程下的考试。

#### 请求体

```json
{
  "id": 19345678,
  "title": "期中考试（更新）",
  "full": 120,
  "startsAt": 1712345678000,
  "endsAt": 1712432078000,
  "duration": 90
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | integer | 是 | 考试展示 ID（9 位数字） |
| `title` | string | 否 | 考试标题，2-32 个字符 |
| `full` | integer | 否 | 总分 |
| `startsAt` | integer | 否 | 开始时间（毫秒时间戳） |
| `endsAt` | integer | 否 | 结束时间（毫秒时间戳） |
| `duration` | integer | 否 | 考试时长（分钟） |

至少需提供一项可修改字段。

#### 成功响应（200）

```json
{
  "code": 0,
  "object": {
    "id": 19345678,
    "courseId": 92345678,
    "title": "期中考试（更新）",
    "full": 120,
    "stage": "preparing",
    "startsAt": 1712345678000,
    "endsAt": 1712432078000,
    "duration": 90,
    "createdAt": 1712345678000
  }
}
```

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失或格式校验不通过 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足（非 teacher） |
| 404 | - | `{}` | 考试不存在 |
| 409 | - | `{}` | 考试不在 preparing 阶段，不可修改 |
| 500 | - | `{}` | 服务器内部错误 |

#### 调用示例

```bash
curl -X POST http://localhost:8088/exam/object \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"id": 19345678, "full": 120, "duration": 90}'
```

---

### 3.18 DELETE /exam/object

删除指定考试。

> **需要认证：** 教师（`teacher`）及以上角色，且只能删除自己课程下的考试。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | integer | 是 | 考试展示 ID（9 位数字） |

#### 成功响应（200）

```json
{
  "code": 0
}
```

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失或格式错误 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足（非 teacher，或非本课程教师） |
| 404 | - | `{}` | 考试不存在 |
| 500 | - | `{}` | 服务器内部错误 |

#### 调用示例

```bash
curl -X DELETE "http://localhost:8088/exam/object?id=19345678" \
  -H "Authorization: Bearer <token>"
```

---

### 3.19 POST /exam/stage

切换考试阶段。阶段只能从前往后切换：`preparing` → `opening` → `grading` → `archived`。

> **需要认证：** 教师（`teacher`）及以上角色，且只能操作自己课程下的考试。

#### 请求体

```json
{
  "id": 19345678,
  "stage": "opening"
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | integer | 是 | 考试展示 ID（9 位数字） |
| `stage` | string | 是 | 目标阶段：`opening` / `grading` / `archived` |

#### 阶段切换规则

| 切换 | 条件 |
|------|------|
| `preparing` → `opening` | 当前时间须在开始时间之前；至少有一份试卷；每份试卷至少有一个题目；各试卷满分之和须等于考试总分 |
| `opening` → `grading` | 当前时间须已超过结束时间，否则拒绝 |
| `grading` → `archived` | 考试下所有试卷须处于 `archived` 阶段 |

#### 成功响应（200）

```json
{
  "code": 0,
  "object": {
    "id": 19345678,
    "courseId": 92345678,
    "title": "期中考试",
    "full": 100,
    "stage": "opening",
    "startsAt": 1712345678000,
    "endsAt": 1712432078000,
    "duration": 120,
    "createdAt": 1712345678000
  }
}
```

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失 |
| 200 | 1 | `exam has no papers` | 考试无试卷，不可开放 |
| 200 | 2 | `paper has no questions` | 某份试卷无题目，不可开放；响应附带 `paperId` 字段指明具体试卷 |
| 200 | 3 | `total score of all papers does not match exam full score` | 试卷满分之和不等于考试总分，不可开放；响应附带 `papers` 数组（每项含 `paperId` 和 `full`），供定位修改或删除 |
| 200 | 4 | `invalid stage transition` | 非法阶段切换（如跳过阶段或向后切换） |
| 200 | 5 | `exam start time has passed, please postpone it first` | 考试开始时间已过，需延后开始时间再开放 |
| 200 | 6 | `exam end time has not passed yet` | 考试结束时间未到，不可进入阅卷 |
| 200 | 7 | `not all papers are archived` | 有试卷未归档，不可归档考试 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足（非 teacher，或非本课程教师） |
| 404 | - | `{}` | 考试不存在 |
| 500 | - | `{}` | 服务器内部错误 |

#### 调用示例

```bash
# 将考试从 preparing 切换到 opening
curl -X POST http://localhost:8088/exam/stage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"id": 19345678, "stage": "opening"}'
```

---

### 3.20 POST /paper/create

创建新试卷（空白）。

> **需要认证：** 教师（`teacher`）及以上角色，且考试须处于 `preparing` 阶段。

#### 请求体

```json
{
  "examId": 19345678,
  "title": "第一单元测验"
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `examId` | integer | 是 | 考试展示 ID（9 位数字） |
| `title` | string | 是 | 试卷标题 |

#### 成功响应（200）

```json
{
  "code": 0,
  "id": 23456789
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer | 试卷展示 ID（9 位数字） |

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失或格式问题 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足（非 teacher，或非本课程教师） |
| 404 | - | `{}` | 考试不存在 |
| 409 | - | `{}` | 考试不在 preparing 阶段 |
| 500 | - | `{}` | 服务器内部错误 |

#### 调用示例

```bash
curl -X POST http://localhost:8088/paper/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"examId": 19345678, "title": "第一单元测验"}'
```

---

### 3.21 GET /paper/list

获取指定考试下的所有试卷基本信息列表。

> **需要认证：** 需登录。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `examId` | integer | 是 | 考试展示 ID（9 位数字） |

#### 成功响应（200）

```json
{
  "code": 0,
  "objects": [
    {
      "id": 23456789,
      "examId": 19345678,
      "title": "第一单元测验",
      "stage": "opening",
      "createdAt": 1712345678000
    }
  ],
  "count": 1
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `objects` | array | 试卷摘要数组 |
| `objects[].id` | integer | 试卷展示 ID |
| `objects[].examId` | integer | 所属考试 ID |
| `objects[].title` | string | 试卷标题 |
| `objects[].stage` | string | 试卷阶段 |
| `objects[].createdAt` | integer | 创建时间（毫秒时间戳） |
| `count` | integer | 试卷数量 |

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失或格式错误 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 500 | - | `{}` | 服务器内部错误 |

#### 调用示例

```bash
curl -X GET "http://localhost:8088/paper/list?examId=19345678" \
  -H "Authorization: Bearer <token>"
```

---

### 3.22 GET /paper/object

获取指定试卷的完整信息（含题目和答案）。

> **需要认证：** 需登录。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | integer | 是 | 试卷展示 ID（9 位数字） |

#### 成功响应（200）

```json
{
  "code": 0,
  "object": {
    "id": 23456789,
    "examId": 19345678,
    "title": "第一单元测验",
    "questions": [
      {
        "type": "obj.ssq",
        "content": "1+1=?",
        "options": ["1", "2", "3", "4"],
        "score": 5
      }
    ],
    "answers": [1],
    "stage": "opening",
    "createdAt": 1712345678000
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `questions` | array | 题目数组（各题型字段不同，经 PaperContent 清洗后输出） |
| `answers` | array | 答案数组（与 questions 一一对应） |

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失或格式错误 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 404 | - | `{}` | 试卷不存在 |
| 500 | - | `{}` | 服务器内部错误 |

#### 调用示例

```bash
curl -X GET "http://localhost:8088/paper/object?id=23456789" \
  -H "Authorization: Bearer <token>"
```

---

### 3.23 POST /paper/object

覆盖保存试卷的题目和答案。每次调用会完全替换原有的题目和答案数组。

> **需要认证：** 教师（`teacher`）及以上角色，且考试须处于 `preparing` 阶段。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | integer | 是 | 试卷展示 ID（9 位数字） |

#### 请求体

```json
{
  "questions": [
    {
      "type": "obj.ssq",
      "content": "1+1=?",
      "options": ["1", "2", "3", "4"],
      "score": 5
    }
  ],
  "answers": [1]
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `questions` | array | 是 | 题目数组，每项须含 `type` 字段（题型标识），其余字段因题型而异 |
| `answers` | array | 是 | 答案数组，与 `questions` 一一对应 |

#### 题型及 type 标识

| type | 题型 | 题目字段 | 答案格式 |
|------|------|---------|---------|
| `obj.ssq` | 单选题 | `content`, `options`(数组), `score` | `integer`（正确选项索引） |
| `obj.msq` | 多选题 | `content`, `options`(数组), `score`, `partial`, `strict` | `integer[]`（正确选项索引数组） |
| `obj.fib` | 客观填空 | `content`, `blanks`(数组) | `string[]`（每空答案） |
| `sbj.fib` | 主观填空 | `content`, `blanks`(数组) | `string[]`（每空答案） |
| `sbj.saq` | 简答题 | `content`, `full` | `string`（答案文本） |

题目和答案会经过 `PaperContent` 校验，格式错误或字段不合法时拒绝保存。

#### 成功响应（200）

返回完整的试卷详情（同 GET /paper/object 格式）。

```json
{
  "code": 0,
  "object": {
    "id": 23456789,
    "examId": 19345678,
    "title": "第一单元测验",
    "questions": [...],
    "answers": [...],
    "stage": "opening",
    "createdAt": 1712345678000
  }
}
```

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失、题目或答案格式校验不通过 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足（非 teacher，或非本课程教师） |
| 404 | - | `{}` | 试卷不存在 |
| 409 | - | `{}` | 考试不在 preparing 阶段 |
| 500 | - | `{}` | 服务器内部错误 |

#### 调用示例

```bash
curl -X POST "http://localhost:8088/paper/object?id=23456789" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"questions": [{"type": "obj.ssq", "content": "1+1=?", "options": ["1","2","3","4"], "score": 5}], "answers": [1]}'
```

---

### 3.24 POST /admin/teacher/create

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

### 3.25 GET /admin/user/list

获取所有用户列表。

> **需要认证：** 管理员（`admin`）角色。

#### 查询参数

无。

#### 成功响应（200）

```json
{
  "code": 0,
  "objects": [
    {
      "accountId": 10000001,
      "userName": "admin",
      "role": "admin",
      "fullName": "Admin",
      "gender": true,
      "createdAt": 1712345678000
    },
    {
      "accountId": 68123457,
      "userName": "johndoe",
      "role": "student",
      "fullName": "John Doe",
      "gender": true,
      "createdAt": 1712345678000
    }
  ],
  "count": 2
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `objects` | array | 用户信息数组（格式同 [GET /user/object](#35-get-userobject)） |
| `count` | integer | 用户总数 |

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足（非 admin） |
| 500 | - | `{}` | 服务器内部错误 |

#### 调用示例

```bash
curl -X GET http://localhost:8088/admin/user/list \
  -H "Authorization: Bearer <token>"
```

---

### 3.26 GET /admin/user/password

重置指定用户的密码为随机密码。

> **需要认证：** 管理员（`admin`）角色。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | integer | 是 | 用户账号 ID（8 位数字） |

#### 成功响应（200）

```json
{
  "code": 0,
  "accountId": 68123457,
  "userName": "johndoe",
  "password": "A1b2C3d4E5f6G7h8"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `accountId` | integer | 用户账号 ID |
| `userName` | string | 用户名 |
| `password` | string | 新的随机密码（16 位，含字母、数字、符号） |

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失或格式错误 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足（非 admin） |
| 404 | - | `{}` | 用户不存在 |
| 500 | - | `{}` | 服务器内部错误 |

#### 调用示例

```bash
curl -X GET "http://localhost:8088/admin/user/password?id=68123457" \
  -H "Authorization: Bearer <token>"
```

---

### 3.27 GET /exam/take

学生开始或续考。随机分配试卷，创建提交记录；已有提交则续考。

> **需要认证：** 学生（`student`）角色。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | integer | 是 | 考试展示 ID（9 位数字） |

#### 前置条件

| 条件 | 说明 |
|------|------|
| 考试阶段 | 须为 `opening` |
| 时间窗口 | `startsAt ≤ now ≤ endsAt` |
| 考试时长 | `now ≤ startsAt + duration` |

#### 成功响应（200）

新考试（无历史提交）：
```json
{
  "exam": {
    "id": 19345678,
    "title": "期中考试",
    "stage": "opening",
    "full": 100,
    "startsAt": 1712345678000,
    "endsAt": 1712432078000,
    "duration": 120
  },
  "paper": {
    "id": 23456789,
    "title": "试卷A",
    "questions": [...]
  },
  "submittedAt": 1712345678000,
  "submit": false
}
```

续考（已有提交）：
```json
{
  "exam": {...},
  "paper": {...},
  "submittedAt": 1712345678000,
  "submit": false,
  "answers": [1, 0, ["Alice"], ...]
}
```

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失或格式错误 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足（非 student） |
| 404 | - | `{}` | 考试不存在 |
| 409 | - | `{}` | 考试不在 `opening` 阶段 |
| 200 | 1 | `exam is not in the time window` | 不在考试起止时间内 |
| 200 | 2 | `exam duration has expired` | 考试时长已过 |
| 200 | 4 | `you have already submitted` | 已交卷，不可再考 |

#### 调用示例

```bash
curl -X GET "http://localhost:8088/exam/take?id=19345678" \
  -H "Authorization: Bearer <token>"
```

---

### 3.28 POST /exam/submit

保存草稿或交卷。

> **需要认证：** 学生（`student`）角色。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | integer | 是 | 考试展示 ID（9 位数字） |

#### 请求体

```json
{
  "answers": [1, 0, ["Alice"], "学生作答"],
  "submit": true
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `answers` | array | 是 | 学生作答数组，与题目一一对应 |
| `submit` | boolean | 是 | `true` 交卷 / `false` 保存草稿 |

#### 前置条件

| 条件 | 说明 |
|------|------|
| 考试阶段 | 须为 `opening` |
| 时间窗口 | `startsAt ≤ now ≤ endsAt` |
| 作答时限 | `now ≤ submittedAt + duration`（草稿）/ `now ≤ submittedAt + duration + 2min`（交卷） |
| 提交状态 | 数据库中 `submit` 不可为 `true`（禁止重复交卷） |

#### 成功响应（200）

```json
{
  "code": 0
}
```

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失或格式错误 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足（非 student） |
| 404 | - | `{}` | 考试不存在 |
| 409 | - | `{}` | 考试不在 `opening` 阶段 |
| 200 | 1 | `exam is not in the time window` | 不在考试起止时间内 |
| 200 | 2 | `exam duration has expired` | 作答超时 |
| 200 | 3 | `submission not found, please take the exam first` | 未开始考试 |
| 200 | 4 | `you have already submitted` | 已交卷 |

#### 调用示例

```bash
curl -X POST "http://localhost:8088/exam/submit?id=19345678" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"answers": [1, 0, ["Alice"]], "submit": true}'
```

---

### 3.29 GET /paper/grade/start

开始批阅试卷。自动评分客观题，主观题标记为 `-1` 待批。

> **需要认证：** 教师（`teacher`）及以上角色，且为课程所有者。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | integer | 是 | 试卷展示 ID（9 位数字） |

#### 流程

```
paper: opening → objecting → (grading | archived)
```

| 步骤 | 说明 |
|------|------|
| 强制收卷 | 所有提交的 `submit` 设为 `true` |
| 客观题 | 自动评分并填入 `scores` 数组 |
| 主观题 | `scores` 填入 `-1` 占位 |
| 无主观题 | 计算 `total`，试卷归档 |
| 有主观题 | 所有提交 `total = -1`，试卷进入 `grading` |

#### 成功响应（200）

```json
{
  "code": 0,
  "object": {
    "id": 23456789,
    "stage": "grading",
    ...
  }
}
```

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失或格式错误 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足（非课程所有者） |
| 404 | - | `{}` | 试卷不存在 |
| 409 | - | `{}` | 考试未处于 `grading` 或试卷未处于 `opening` 阶段 |

#### 调用示例

```bash
curl -X GET "http://localhost:8088/paper/grade/start?id=23456789" \
  -H "Authorization: Bearer <token>"
```

---

### 3.30 GET /paper/grade/tasks

查看评分进度。竖向统计各主观题已评数量。

> **需要认证：** 教师（`teacher`）及以上角色，且为课程所有者。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | integer | 是 | 试卷展示 ID（9 位数字） |

#### 成功响应（200）

```json
{
  "code": 0,
  "finished": false,
  "submissions": 64,
  "questions": [
    { "index": 7, "graded": 5 },
    { "index": 9, "graded": 0 }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `finished` | boolean | 所有主观题是否全部评完 |
| `submissions` | integer | 该试卷的提交总数 |
| `questions` | array | 主观题评分进度数组 |
| `questions[].index` | integer | 题目索引（0-based） |
| `questions[].graded` | integer | 已评数量 |

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失或格式错误 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足 |
| 404 | - | `{}` | 试卷或考试不存在 |

#### 调用示例

```bash
curl -X GET "http://localhost:8088/paper/grade/tasks?id=23456789" \
  -H "Authorization: Bearer <token>"
```

---

### 3.31 GET /paper/grade/next

随机获取一份未评分的主观题作答。

> **需要认证：** 教师（`teacher`）及以上角色，且为课程所有者。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | integer | 是 | 试卷展示 ID（9 位数字） |
| `questionIndex` | integer | 是 | 主观题索引（0-based） |

#### 前置条件

| 条件 | 说明 |
|------|------|
| 试卷阶段 | 须为 `objecting` 或 `grading` |
| 题目 | 须为主观题且索引合法 |

#### 成功响应（200）

有未评分：
```json
{
  "code": 0,
  "found": true,
  "question": {
    "type": "sbj.saq",
    "content": "简述牛顿第一定律",
    "full": 10
  },
  "answer": "物体在不受力时保持静止...",
  "token": "aes256gcm_encrypted_token"
}
```

全部已评完：
```json
{
  "code": 0,
  "found": false,
  "question": null,
  "answer": null,
  "token": null
}
```

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失、题目非主观或索引非法 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足 |
| 404 | - | `{}` | 试卷或考试不存在 |
| 409 | - | `{}` | 试卷未处于可批阅状态 |

#### 调用示例

```bash
curl -X GET "http://localhost:8088/paper/grade/next?id=23456789&questionIndex=7" \
  -H "Authorization: Bearer <token>"
```

---

### 3.32 POST /paper/grade/score

提交主观题评分。

> **需要认证：** 教师（`teacher`）及以上角色，且为课程所有者。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | integer | 是 | 试卷展示 ID（9 位数字） |

#### 请求体

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `token` | string | 是 | `grade/next` 下发的评分令牌 |
| `score` | number | 是 | 分数，须在 `[0, 题目满分]` 范围内 |

```json
{
  "token": "aes256gcm_encrypted_token",
  "score": 8
}
```

#### 前置条件

| 条件 | 说明 |
|------|------|
| 试卷阶段 | 须为 `objecting` 或 `grading` |
| token | 须有效、未过期、且为本教师所有 |
| 目标题目 | 须为主观题且尚未评分 |

#### 成功响应（200）

```json
{
  "code": 0,
  "score": 8
}
```

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失、token 无效、分数越界或非主观题 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足（非课程所有者或非本教师 token） |
| 404 | - | `{}` | 试卷、考试或提交不存在 |
| 409 | - | `{}` | 试卷未处于可批阅状态 |
| 200 | 1 | `grade token has expired` | 评分令牌已过期 |
| 200 | 2 | `this question has already been graded` | 该题已评分 |

#### 调用示例

```bash
curl -X POST "http://localhost:8088/paper/grade/score?id=23456789" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"token": "...", "score": 8}'
```

---

### 3.33 GET /paper/grade/finish

完成评分。校验所有题目已评，计算总分，归档试卷。

> **需要认证：** 教师（`teacher`）及以上角色，且为课程所有者。

#### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | integer | 是 | 试卷展示 ID（9 位数字） |

#### 流程

```
paper: (objecting | grading) → calculating → archived
```

| 步骤 | 说明 |
|------|------|
| 校验 | 所有提交的所有题目均已评分（`scores` 中无 `-1`） |
| 计算 | 试卷进入 `calculating` 阶段，计算所有提交的 `total` |
| 归档 | 试卷进入 `archived` 阶段 |

#### 成功响应（200）

```json
{
  "code": 0,
  "object": {
    "id": 23456789,
    "stage": "archived",
    ...
  }
}
```

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 400 | - | `{}` | 参数缺失或格式错误 |
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 403 | -1 | `permission required` | 权限不足 |
| 404 | - | `{}` | 试卷不存在 |
| 409 | - | `{}` | 试卷未处于可批阅状态 |
| 200 | 1 | `not all questions have been graded` | 还有题目未评分 |

#### 调用示例

```bash
curl -X GET "http://localhost:8088/paper/grade/finish?id=23456789" \
  -H "Authorization: Bearer <token>"
```

---

### 3.34 GET /my

获取当前用户的个性化考试主页，按角色返回不同分类的考试列表。

> **需要认证：** 需登录。

#### 查询参数

无。

#### 教师响应

考试按以下分组返回，每组内按开始时间升序排列：

| 分组 | 说明 |
|------|------|
| `opening` | 进行中的考试 |
| `grading` | 批改中的考试 |
| `preparing` | 准备中的考试 |

```json
{
  "code": 0,
  "opening": [
    {
      "id": 19345678,
      "courseId": 92345678,
      "courseTitle": "高等数学",
      "title": "期中考试",
      "full": 100,
      "stage": "opening",
      "startsAt": 1712345678000,
      "endsAt": 1712432078000,
      "duration": 120,
      "createdAt": 1712345678000
    }
  ],
  "grading": [...],
  "preparing": [...]
}
```

#### 学生响应

考试按以下分组返回，每组内按开始时间升序排列：

| 分组 | 说明 |
|------|------|
| `opening` | 进行中的考试 |
| `archived` | 近一周内结束的归档考试 |
| `grading` | 批改中的考试 |

每个考试项额外包含 `score` 和 `status` 字段。

```json
{
  "code": 0,
  "opening": [
    {
      "id": 19345678,
      "courseId": 92345678,
      "courseTitle": "高等数学",
      "title": "期中考试",
      "full": 100,
      "stage": "opening",
      "startsAt": 1712345678000,
      "endsAt": 1712432078000,
      "duration": 120,
      "createdAt": 1712345678000,
      "score": -1,
      "status": "not_taken"
    }
  ],
  "archived": [
    {
      "id": 19345679,
      "courseId": 92345678,
      "courseTitle": "高等数学",
      "title": "期末考",
      "full": 100,
      "stage": "archived",
      "startsAt": 1712345678000,
      "endsAt": 1712432078000,
      "duration": 120,
      "createdAt": 1712345678000,
      "score": 85,
      "status": "submitted"
    }
  ],
  "grading": [...]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `objects[].courseTitle` | string | 所属课程名称 |
| `objects[].score` | integer | 考试成绩（学生专有），未归档或无提交时返回 `-1` |
| `objects[].status` | string | 参与状态（学生专有）：`not_taken` / `in_progress` / `submitted` |

#### 错误响应

| HTTP 状态码 | code | msg | 说明 |
|-------------|------|-----|------|
| 401 | -1 | `token is not provided, invalid or expired` | 未认证 |
| 500 | - | `{}` | 服务器内部错误 |

#### 调用示例

```bash
curl -X GET http://localhost:8088/my \
  -H "Authorization: Bearer <token>"
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

### 5.3 考试（Exam）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer | 自增主键 |
| `course_id` | integer | 所属课程 ID（外键关联 Course） |
| `title` | varchar(32) | 考试标题 |
| `full` | integer | 总分 |
| `stage` | varchar(16) | 阶段：`preparing` / `opening` / `grading` / `archived` |
| `starts_at` | timestamp | 开始时间 |
| `ends_at` | timestamp | 结束时间 |
| `duration` | integer | 考试时长（分钟） |
| `created_at` | timestamp | 创建时间 |
| `updated_at` | timestamp | 更新时间 |

### 5.4 试卷（Paper）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer | 自增主键 |
| `exam_id` | integer | 所属考试 ID（外键关联 Exam） |
| `title` | varchar(64) | 试卷标题 |
| `questions` | jsonb | 题目数组（经 PaperContent 清洗后存储） |
| `answers` | jsonb | 答案数组（与 questions 一一对应） |
| `stage` | varchar(16) | 试卷阶段 |
| `created_at` | timestamp | 创建时间 |
| `updated_at` | timestamp | 更新时间 |

### 5.5 提交记录（Submission）

| 字段 | 类型 | 说明 |
|------|------|------|
| `exam_id` | integer | 考试 ID（联合主键，外键关联 Exam） |
| `student_id` | integer | 学生 ID（联合主键，外键关联 User） |
| `paper_id` | integer | 分配的试卷 ID（外键关联 Paper） |
| `answers` | jsonb | 学生作答数组 |
| `submit` | boolean | 是否已交卷 |
| `scores` | jsonb | 逐题评分数组（integer 数组） |
| `total` | double | 总分，未完成时暂为 `-1` |
| `submitted_at` | timestamp | 创建（开始考试）时间 |

### 5.6 邀请码（InviteCode）

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | varchar(16) | 16 位随机十六进制字符串 |
| `expiresAt` | timestamp | 过期时间 |
| 有效期 | - | 默认 7 天（可通过 `codeDays` 参数自定义） |

### 5.7 角色枚举

| 角色 | 值 | 说明 |
|------|-----|------|
| 学生 | `student` | 注册默认角色 |
| 教师 | `teacher` | 通过管理员创建 |
| 管理员 | `admin` | 系统初始化时通过环境变量创建 |

### 5.8 考试阶段枚举

| 阶段 | 值 | 说明 |
|------|-----|------|
| 准备中 | `preparing` | 考试创建后的初始阶段，可修改 |
| 进行中 | `opening` | 考试开放作答 |
| 批改中 | `grading` | 考试结束，阅卷中 |
| 已归档 | `archived` | 考试归档，不可修改 |

### 5.9 试卷阶段枚举

| 阶段 | 值 | 说明 |
|------|-----|------|
| 开放批阅 | `opening` | 初始状态，等待自动评分 |
| 客观评分中 | `objecting` | 正在进行客观题自动评分 |
| 主观批阅中 | `grading` | 教师正在批阅主观题 |
| 总分计算中 | `calculating` | 正在汇总总分 |
| 已归档 | `archived` | 评分完成，最终归档 |

### 5.10 参与状态枚举

| 状态 | 值 | 说明 |
|------|-----|------|
| 未参考 | `not_taken` | 学生未开始考试 |
| 一开始 | `in_progress` | 学生已开始，尚未交卷 |
| 已提交 | `submitted` | 学生已交卷 |

### 5.11 展示 ID（DisplayableId）

展示 ID 是对自增主键进行 Feistel 加密后附加校验码生成的 9 位数字，用于对外暴露时隐藏真实主键。

- **算法：** Feistel 网络（8 轮），HMAC-SHA256 作为轮函数
- **校验码：** 加权和模 9 加 1，置于最高位
- **格式：** `C + encrypted(8位)` → 共 9 位数字
- **密钥：** 通过环境变量 `DISPLAY_ID_KEY` 配置

### 5.12 密码加密

- **算法：** scrypt（随机 16 字节盐值，32 字节密钥长度）
- **密码比较：** 使用 `timingSafeEqual` 防止时序攻击

### 5.13 数据库表

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
