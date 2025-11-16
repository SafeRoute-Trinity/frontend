# Auth0 配置说明

## 1. 获取 Auth0 配置信息

1. 登录 [Auth0 Dashboard](https://manage.auth0.com/)
2. 创建一个新的 Application（如果还没有）
3. 选择应用类型为 **Native** 或 **Single Page Application**
4. 在应用设置中，找到以下信息：
   - **Domain**: 例如 `your-tenant.auth0.com`
   - **Client ID**: 你的应用客户端 ID

## 2. 配置回调 URL

在 Auth0 Dashboard 的应用设置中，添加以下回调 URL：

### iOS
```
saferouteapp://
```

### Android
```
saferouteapp://
```

### Web (如果支持)
```
http://localhost:8081
https://your-domain.com
```

## 3. 配置环境变量

创建 `.env` 文件（在项目根目录），并添加以下内容：

```env
EXPO_PUBLIC_AUTH0_DOMAIN=your-auth0-domain.auth0.com
EXPO_PUBLIC_AUTH0_CLIENT_ID=your-auth0-client-id
```

**注意**: 将 `your-auth0-domain` 和 `your-auth0-client-id` 替换为你在 Auth0 Dashboard 中获取的实际值。

## 4. 更新配置文件

如果你不想使用环境变量，可以直接编辑 `config/auth0.ts` 文件，替换默认值：

```typescript
const AUTH0_DOMAIN = 'your-auth0-domain.auth0.com';
const AUTH0_CLIENT_ID = 'your-auth0-client-id';
```

## 5. 安装依赖

确保已安装所有必要的依赖：

```bash
npm install
```

## 6. 运行应用

```bash
npm start
```

## 使用说明

- **登录**: 点击"登录"按钮，会打开 Auth0 的登录页面
- **登出**: 点击"登出"按钮，会清除本地存储的认证信息并登出

## 故障排除

### 登录后无法回调
- 确保在 Auth0 Dashboard 中正确配置了回调 URL
- 检查 `app.json` 中的 `scheme` 配置是否与回调 URL 匹配

### 环境变量不生效
- 确保环境变量以 `EXPO_PUBLIC_` 开头
- 重启 Expo 开发服务器
- 对于生产构建，需要重新构建应用


