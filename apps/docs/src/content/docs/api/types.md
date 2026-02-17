---
title: Types
description: TypeScript type reference for Træk.
---

# Types

## MessageNode

```ts
interface MessageNode {
  id: string
  parentId: string | null
  role: 'user' | 'assistant' | 'system'
  type: 'TEXT' | 'CODE' | 'THOUGHT'
  status: 'streaming' | 'done' | 'error'
  content: string
  metadata: {
    x: number
    y: number
    timestamp: number
  }
}
```

## TraekEngineConfig

```ts
interface TraekEngineConfig {
  // Configuration options for the engine
  maxNodes?: number
  defaultLayout?: 'vertical' | 'horizontal'
}
```
