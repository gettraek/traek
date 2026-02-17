---
title: TextNode
description: API reference for the TextNode component.
---

# TextNode

Default message renderer with markdown, code highlighting, and image support.

## Features

- Markdown rendering via `marked` + `DOMPurify`
- Syntax highlighting via `highlight.js`
- Image support
- Thought/reasoning panel

## Usage

TextNode is used automatically as the default renderer. You can override it with a custom component via the `components` prop on `TraekCanvas`.
