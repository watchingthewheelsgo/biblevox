# BibleVox Creem 本地测试指南

本文档说明如何在本地测试 BibleVox 的 Creem 解锁支付（单章 `$2`，全量 `$30`）。

## 1) 环境变量

在 `.env` 中配置（变量命名与 voicex 保持一致）：

```bash
CREEM_API_KEY=creem_...             # Creem Dashboard > Developers
CREEM_WEBHOOK_SECRET=...            # Webhook endpoint 对应签名密钥
CREEM_CHAPTER_PRODUCT_ID=prod_...   # 对应 $2 单章解锁产品
CREEM_UNLOCK_PRODUCT_ID=prod_...    # 对应 $30 全量解锁产品

DATABASE_URL=postgres://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_BASE_URL=http://localhost:8787
FRONTEND_URL=http://localhost:5173
```

## 2) 启动项目

```bash
npm run dev
```

默认前端 `5173`，后端 `8787`。

## 3) 配置 Creem 产品

在 Creem Dashboard（Test Mode）创建两个 one-time 产品：

- `BibleVox Chapter Unlock`：`$2`，填入 `CREEM_CHAPTER_PRODUCT_ID`
- `BibleVox Unlock All`：`$30`，填入 `CREEM_UNLOCK_PRODUCT_ID`

## 4) 配置 Webhook（本地）

Creem 无法直接回调 localhost，需要隧道：

```bash
cloudflared tunnel --url http://localhost:8787
```

拿到 `https://xxx.trycloudflare.com` 后，在 Creem 配置 Webhook URL：

`https://xxx.trycloudflare.com/api/webhooks/creem`

并把该 endpoint 的 secret 填到 `CREEM_WEBHOOK_SECRET`。

## 5) 测试流程

1. 注册并登录 BibleVox；
2. 未验证邮箱时，仅可读前 2 章；验证后可读前 5 章；
3. 打开第 6 章及以后内容，可选择：
   - `Unlock This Chapter ($2)`（解锁当前章）
   - `Unlock All ($30)`（解锁全章节）
4. 点击后跳转 Creem Checkout，使用测试卡支付；
5. 支付成功 + webhook 到达后：
   - 单章购买：该 `bookId + chapter` 写入 `chapter_unlocks`，后续不重复扣款
   - 全量购买：`users.unlocked_all = true`

## 6) 常见问题

- **点击解锁没跳转 Checkout**：
  - 检查 `CREEM_API_KEY`、`CREEM_CHAPTER_PRODUCT_ID`、`CREEM_UNLOCK_PRODUCT_ID` 是否正确；
- **支付成功但未解锁**：
  - 检查 webhook URL 是否可达；
  - 检查 `CREEM_WEBHOOK_SECRET` 是否对应当前 endpoint；
- **本地先验证流程**：
  - 可用后端 fallback 接口 `POST /api/purchase/unlock-all` 直接模拟全量解锁。
