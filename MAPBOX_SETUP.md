# Mapbox 配置说明

## 1. 获取 Mapbox Access Token

1. 访问 [Mapbox Account](https://account.mapbox.com/)
2. 登录或注册账号
3. 在 [Access Tokens](https://account.mapbox.com/access-tokens/) 页面
4. 创建新的 access token 或使用默认的 token
5. 复制你的 access token

## 2. 配置 Access Token

### 方法 1: 使用环境变量（推荐）

编辑 `.env` 文件（在项目根目录），添加：

```env
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=your-mapbox-access-token-here
```

**注意**: 将 `your-mapbox-access-token-here` 替换为你在 Mapbox 获取的实际 token。

### 方法 2: 直接在配置文件中设置

如果你不想使用环境变量，可以直接编辑 `config/mapbox.ts` 文件：

```typescript
const MAPBOX_ACCESS_TOKEN = 'your-mapbox-access-token-here';
```

## 3. 配置说明

### 当前实现

项目已经配置了两种地图方案：

1. **react-native-maps** (当前使用)
   - 默认使用 Google Maps
   - 已安装但需要配置 Google Maps API key（如果使用 Google Maps）
   - 或者可以切换到 Mapbox 样式

2. **@rnmapbox/maps** (已安装，可选)
   - 真正的 Mapbox SDK
   - 需要 Mapbox access token
   - 需要运行 `npx expo prebuild` 来配置原生代码

### 使用 react-native-maps (当前方案)

如果你继续使用 `react-native-maps`，需要配置 Google Maps API key：

在 `app.config.ts` 中添加：

```typescript
ios: {
  config: {
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  },
},
android: {
  config: {
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  },
},
```

然后在 `.env` 文件中添加：
```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### 使用 @rnmapbox/maps (推荐，真正的 Mapbox)

如果你要使用真正的 Mapbox SDK：

1. 确保已配置 `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` 在 `.env` 文件中
2. 运行 `npx expo prebuild` 生成原生配置
3. 更新代码使用 `@rnmapbox/maps` 组件

## 4. 验证配置

配置完成后：

1. 重启 Expo 开发服务器：`npx expo start --clear`
2. 如果使用原生 Mapbox，需要重新构建应用：
   ```bash
   npx expo prebuild
   npx expo run:ios
   # 或
   npx expo run:android
   ```

## 5. 故障排除

### Token 未生效
- 确保环境变量以 `EXPO_PUBLIC_` 开头
- 重启 Expo 开发服务器
- 对于生产构建，需要重新构建应用

### 地图不显示
- 检查 access token 是否正确
- 检查网络连接
- 查看控制台错误信息

## 获取 Access Token 的链接

- [Mapbox Account](https://account.mapbox.com/)
- [Access Tokens 页面](https://account.mapbox.com/access-tokens/)
- [Mapbox 文档](https://docs.mapbox.com/)


