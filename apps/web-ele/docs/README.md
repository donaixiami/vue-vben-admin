# Web Ele Documentation

这里存放 `apps/web-ele` Element Plus 应用相关的文档。

## 使用范围

- 只记录 `apps/web-ele` 内部的业务模块、页面、接口、联调、测试和排障说明。
- 跨应用或仓库级上下文仍放在根目录 `docs/PROJECT_CONTEXT.md`。
- 如果文档内容会影响后续恢复上下文，也需要同步更新 `docs/PROJECT_CONTEXT.md`。

## 建议结构

```text
apps/web-ele/docs/
  README.md             文档索引和约定
  api/                  前端 API 对接说明
  modules/              业务模块说明
  troubleshooting/      常见问题和排障记录
  testing/              测试步骤和验证记录
```

后续新增 ele 相关文档时，优先放到这里，不再散落到仓库根目录。
