# tool-message-test-mcp

一个用于测试 MCP Tool 各种消息类型返回的测试服务器。覆盖了文本、图片、音频、资源链接、嵌入式资源、结构化内容、annotations 以及各种边界/异常 case。

## 使用

### 通过 bunx 直接运行（无需 clone）

```bash
bunx github:acdzh/tool-message-test-mcp
```

### 本地开发

```bash
# 安装依赖
bun install

# 运行
bun run index.ts
```

### 在 MCP 客户端中配置

```json
{
  "mcpServers": {
    "message-test": {
      "command": "bunx",
      "args": ["github:acdzh/tool-message-test-mcp"]
    }
  }
}
```

```json
{
  "mcpServers": {
    "message-test": {
      "command": "bun run",
      "args": ["/Users/admin/dev/work/mcp/server/message-test/index.ts"]
    }
  }
}
```

## 提供的 Tools

| Tool | 描述 |
|------|------|
| `test_text` | 各种文本内容（plain/multi/markdown/unicode/long/empty） |
| `test_image` | 图片 base64 编码（png/jpg/gif/webp/svg/multi） |
| `test_image_uri` | image-uri 类型（basic/full/multi_scheme） |
| `test_audio` | 音频 base64 编码（wav/mp3） |
| `test_resource_link` | 资源链接（basic/full） |
| `test_embedded_resource` | 嵌入式资源（text/blob/with_annotations） |
| `test_mixed_content` | 混合所有标准内容类型 |
| `test_annotations` | Annotations 测试 |
| `test_structured_content` | 结构化内容 + outputSchema |
| `test_error` | 错误响应 |
| `test_large_content` | 大量 content items |
| `test_invalid_types` | 非法内容类型 |
| `test_invalid_structure` | 非法 content 结构 |
| `test_invalid_fields` | 字段缺失或错误 |
| `test_invalid_annotations` | 非法 annotations |
| `test_invalid_result_fields` | 非法结果字段 |
| `test_throws` | 工具抛出异常 |
| `test_mixed_valid_invalid` | 混合有效和无效 items |
