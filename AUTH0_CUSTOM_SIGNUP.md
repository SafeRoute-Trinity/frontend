# Auth0 自定义注册配置指南

## 添加 First Name、Last Name 和密码确认功能

要在 Auth0 注册流程中添加 first name、last name 字段以及密码确认功能，需要在 Auth0 Dashboard 中进行配置。

## 前提：检查你的 Universal Login 版本

1. 登录 [Auth0 Dashboard](https://manage.auth0.com/)
2. 导航到 **Branding** → **Universal Login**
3. 查看页面顶部，确认是使用 **Classic** 还是 **New** Universal Login Experience

根据你使用的版本，选择对应的配置方法。

---

## ⭐ 推荐方法：使用 Auth0 Actions（适用于所有版本）

这是最灵活和现代的方法，适用于 Classic 和 New Universal Login。

### 1. 启用 Database Connection 的自定义字段

1. 进入 **Authentication** → **Database**
2. 点击你的 Database Connection（如 `Username-Password-Authentication`）
3. 进入 **Settings** 标签
4. 找到 **Requires Username** 选项（可选，如果需要用户名）
5. 保存更改

### 2. 创建 Pre-User Registration Action

这个 Action 会在用户注册时收集额外的字段。

1. 导航到 **Actions** → **Library**
2. 点击 **+ Build Custom**
3. 创建新 Action：
   - **Name**: `Add Custom Signup Fields`
   - **Trigger**: `Pre User Registration`
   - **Runtime**: 选择最新版本

4. 使用以下代码：

```javascript
/**
 * Handler that will be called during Pre User Registration
 */
exports.onExecutePreUserRegistration = async (event, api) => {
  // 从表单数据中获取自定义字段
  const firstName = event.request.body?.first_name || event.request.body?.given_name;
  const lastName = event.request.body?.last_name || event.request.body?.family_name;

  // 设置用户的 metadata
  if (firstName) {
    api.user.setUserMetadata('first_name', firstName);
  }

  if (lastName) {
    api.user.setUserMetadata('last_name', lastName);
  }

  // 可选：设置用户的显示名称
  if (firstName && lastName) {
    api.user.setAppMetadata('full_name', `${firstName} ${lastName}`);
  }
};
```

5. 点击 **Deploy**
6. 进入 **Actions** → **Flows** → **Pre User Registration**
7. 将刚创建的 Action 拖到流程中
8. 点击 **Apply**

### 3. 配置注册表单显示字段

#### 如果使用 New Universal Login：

1. 进入 **Branding** → **Universal Login**
2. 点击 **Advanced Options**
3. 在 **Signup** 部分，启用 **Prompt for Name** 选项
4. 这会自动显示 First Name 和 Last Name 字段

或者使用 API 配置：

```bash
# 使用 Auth0 Management API
curl -X PATCH 'https://YOUR_DOMAIN.auth0.com/api/v2/prompts/signup' \
  -H 'Authorization: Bearer YOUR_MANAGEMENT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "identifiers": ["email"],
    "attributes": {
      "name": {
        "required": true
      }
    }
  }'
```

#### 如果使用 Classic Universal Login (Lock Widget)：

1. 进入 **Branding** → **Universal Login**
2. 切换到 **Advanced** 标签
3. 启用 **Customize Login Page**
4. 在模板代码中找到 Lock 配置，添加：

```javascript
var lock = new Auth0Lock(config.clientID, config.auth0Domain, {
  // ... 现有配置

  additionalSignUpFields: [
    {
      name: 'first_name',
      placeholder: 'First Name',
      validator: function (firstName) {
        return {
          valid: firstName.length > 0,
          hint: 'First name is required',
        };
      },
    },
    {
      name: 'last_name',
      placeholder: 'Last Name',
      validator: function (lastName) {
        return {
          valid: lastName.length > 0,
          hint: 'Last name is required',
        };
      },
    },
  ],

  auth: {
    params: {
      scope: 'openid profile email',
    },
  },
});
```

5. 点击 **Save Changes**

### 4. 配置密码策略

### 5. 配置密码确认

**密码确认功能是 Auth0 内置的**：

- Auth0 的注册表单默认要求用户输入密码两次
- 无需额外配置，这是标准的安全实践

如果你想要自定义密码验证规则：

1. 进入 **Security** → **Attack Protection**
2. 配置 **Brute Force Protection** 和 **Breached Password Detection**

---

## 快速配置步骤总结

### 最简单的方法（推荐）：

1. **启用 New Universal Login**
   - Branding → Universal Login → 选择 "New"

2. **在 Database Connection 中启用名称字段**
   - Authentication → Database → 点击你的连接
   - Settings → 确保 "Disable Sign Ups" 未勾选

3. **配置注册表单显示名称字段**
   - Branding → Universal Login → 点击 "Customize"
   - 在 Signup 表单配置中启用 "Prompt for Name"

4. **创建 Pre-User Registration Action**
   - Actions → Library → Build Custom
   - 使用上面提供的代码保存 first_name 和 last_name

5. **测试**
   - 清除浏览器缓存
   - 尝试注册新用户
   - 检查是否显示 First Name 和 Last Name 字段

## 获取注册后的用户信息

注册完成后，可以通过 Auth0 的 `userInfo` 端点获取用户的完整信息：

```typescript
const userInfo = await auth0.auth.userInfo({
  token: credentials.accessToken,
});

// userInfo 将包含：
// {
//   sub: "auth0|...",
//   email: "user@example.com",
//   name: "John Doe",
//   given_name: "John",  // first name
//   family_name: "Doe",  // last name
//   user_metadata: {
//     first_name: "John",
//     last_name: "Doe"
//   }
// }
```

## 测试配置

1. 清除应用缓存和 Auth0 session
2. 重新打开注册页面
3. 验证是否显示 first name 和 last name 字段
4. 尝试提交空值，验证是否显示错误提示
5. 输入不匹配的密码，验证是否提示密码不一致

## 常见问题

### Q: 自定义字段的数据存储在哪里？

A: Auth0 会将自定义字段存储在用户的 `user_metadata` 中。

### Q: 如何在后端 API 中获取这些字段？

A: 在 JWT token 的 claims 中包含这些信息，或者通过 Auth0 Management API 查询用户信息。

### Q: 密码策略在哪里配置？

A: **Security** → **Database** → 选择你的 Database Connection → **Password Policy**

### Q: 如何自定义错误消息？

A: 在 Lock 配置的 `languageDictionary` 中添加自定义消息，或在 Universal Login 的 HTML 模板中修改。

## 推荐配置

对于生产环境，推荐：

1. 使用 **New Universal Login Experience**（更现代、安全）
2. 配置强密码策略（至少 8 个字符，包含大小写字母和数字）
3. 使用 **Actions** 处理额外的注册逻辑
4. 启用 **Multi-Factor Authentication (MFA)** 提高安全性
