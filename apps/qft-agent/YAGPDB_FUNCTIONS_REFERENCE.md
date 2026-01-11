# YAGPDB-Style Template Functions Reference

This document lists all YAGPDB-compatible template functions added to the QFT bot's template engine.

---

## Data Structure Functions

### `cembed`
Create an embed object for Discord messages.

**Syntax:**
```handlebars
{{cembed "Title" "Description" "#FF5733"}}
{{cembed (sdict "title" "My Title" "description" "My Description" "color" "#FF5733")}}
```

**Parameters:**
- Positional: `title`, `description`, `color` (hex color)
- Or single object with properties: `title`, `description`, `color`, `fields`, `footer`, `author`, `thumbnail`, `image`, `timestamp`

**Returns:** Embed object

---

### `sdict`
Create a string dictionary (object/map).

**Syntax:**
```handlebars
{{$dict := sdict "key1" "value1" "key2" "value2"}}
{{$embed := cembed (sdict "title" "Hello" "description" "World")}}
```

**Parameters:** Alternating key-value pairs

**Returns:** Object

---

### `cslice`
Create a slice (array).

**Syntax:**
```handlebars
{{$arr := cslice "item1" "item2" "item3"}}
{{$fields := cslice (sdict "name" "Field 1" "value" "Value 1")}}
```

**Parameters:** Any number of items

**Returns:** Array

---

## Message Functions

### `sendMessageNoEscapeRetID`
Send a message and return its ID.

**Syntax:**
```handlebars
{{$msgId := sendMessageNoEscapeRetID nil "Hello!"}}
{{$msgId := sendMessageNoEscapeRetID "1234567890" "Hello!"}}
{{$msgId := sendMessageNoEscapeRetID nil $embedObject}}
```

**Parameters:**
- `channelId` (string or `nil` for current channel)
- `content` (string or embed object)

**Returns:** Message ID (string)

---

### `getMessage`
Fetch a message object by channel and message ID.

**Syntax:**
```handlebars
{{$msg := getMessage "channelId" "messageId"}}
{{$msg := getMessage nil "messageId"}}
```

**Parameters:**
- `channelId` (string or `nil` for current channel)
- `messageId` (string)

**Returns:** Message object or `null`

---

### `deleteMessage`
Delete a message with optional delay.

**Syntax:**
```handlebars
{{deleteMessage nil "messageId" 5}}
{{deleteMessage "channelId" "messageId" 0}}
```

**Parameters:**
- `channelId` (string or `nil` for current channel)
- `messageId` (string)
- `delaySeconds` (number, 0 for immediate)

**Returns:** Empty string

---

## Reaction Functions

### `addMessageReactions`
Add one or more reactions to a message.

**Syntax:**
```handlebars
{{addMessageReactions nil $messageId "👍"}}
{{addMessageReactions nil $messageId "👍" "❤️" "🎉"}}
```

**Parameters:**
- `channelId` (string or `nil` for current channel)
- `messageId` (string)
- `...emojis` (one or more emoji strings)

**Returns:** Empty string

---

### `deleteMessageReaction`
Remove a specific user's reaction from a message.

**Syntax:**
```handlebars
{{deleteMessageReaction nil $messageId $userId "👍"}}
```

**Parameters:**
- `channelId` (string or `nil` for current channel)
- `messageId` (string)
- `userId` (string)
- `emojiName` (string - emoji name or ID)

**Returns:** Empty string

---

## Type Conversion Functions

### `toInt64`
Convert a value to a Discord ID string (for compatibility).

**Syntax:**
```handlebars
{{$id := toInt64 .Channel.ID}}
```

**Parameters:**
- `value` (any)

**Returns:** String representation

---

## Context Variables

### Reaction Event Context

When a custom command is triggered by a reaction, the following context is available:

```handlebars
{{.Reaction.Emoji.Name}}        - Emoji name (e.g., "📌")
{{.Reaction.Emoji.ID}}          - Emoji ID (for custom emojis)
{{.Reaction.Emoji.APIName}}     - Full emoji identifier
{{.Reaction.Emoji.Animated}}    - Boolean, true if animated
{{.Reaction.Count}}             - Number of reactions

{{.ReactionMessage.ID}}         - ID of the message that was reacted to
{{.ReactionMessage.Content}}    - Content of the reacted message
{{.ReactionMessage.Author}}     - Author of the reacted message

{{.User.ID}}                    - ID of user who reacted
{{.User.Username}}              - Username of user who reacted
{{.User.Mention}}               - Mention string for user (<@userId>)

{{.Message}}                    - Same as .ReactionMessage
{{.Message.Link}}               - Direct link to the message
{{.Message.Content}}            - Message content
{{.Message.Author.ID}}          - Message author ID
{{.Message.Author.Bot}}         - True if author is a bot

{{.Channel.ID}}                 - Channel ID where reaction occurred
{{.Channel.Name}}               - Channel name

{{.BotUser.ID}}                 - Bot's user ID
{{.BotUser.Username}}           - Bot's username
```

---

## Example: Sticky Pin Command

```handlebars
{{$stickyPin := dbGet "Sticky_Pin"}}
{{$sticky := $stickyPin.Sticky_Message}}

{{if eq .Reaction.Emoji.Name "📌"}}
  {{deleteMessageReaction nil .ReactionMessage.ID .User.ID .Reaction.Emoji.Name}}
  {{if not .Message.Author.Bot}}
    {{$newPin := sdict "Pin_Channel" .Channel.ID "Pin_Message" .Message.ID "Pin_User" .User.ID}}
    {{if $sticky}}
      {{deleteMessage nil $sticky 0.5}}
    {{end}}
    
    {{$content := .Message.Content}}
    {{if gt (len $content) 1000}}
      {{$content = joinStr "" ">>> " (slice $content 0 993) "..."}}
    {{end}}
    
    {{$embed := cembed (sdict
      "title" "📌 • Pinned Sticky"
      "description" (joinStr "" .User.Mention " has pinned the following message.")
      "fields" (cslice
        (sdict "name" "📝 • Message" "value" $content "inline" false)
        (sdict "name" "🔗 • Jump to Message" "value" (joinStr "" "[Click here](" .Message.Link ")") "inline" false)
      )
    )}}
    
    {{$responseId := sendMessageNoEscapeRetID nil $embed}}
    {{addMessageReactions nil $responseId "🚫"}}
    
    {{$newPin.Sticky_Message = $responseId}}
    {{dbSet "Sticky_Pin" $newPin}}
  {{end}}

{{else if eq .Reaction.Emoji.Name "🚫"}}
  {{deleteMessageReaction nil .ReactionMessage.ID .User.ID .Reaction.Emoji.Name}}
  {{if eq .Message.Author.ID .BotUser.ID}}
    {{deleteMessage nil .Message.ID 2}}
    {{dbDel "Sticky_Pin"}}
  {{end}}
{{end}}
```

---

## Notes

1. **Channel ID `nil`**: Using `nil` as a channel ID defaults to the current channel (where the command was triggered).

2. **Reaction Commands**: Set trigger type to `reaction` and optionally specify an emoji filter. Leave emoji blank to match any emoji.

3. **Database Keys**: QFT's `dbGet`/`dbSet` are automatically scoped per-guild. No need to include guild ID in the key.

4. **Embed Fields**: When using `cembed` with `sdict`, the `fields` property should be a `cslice` of field objects (each with `name`, `value`, and optional `inline`).

5. **Message Links**: `.Message.Link` is automatically generated and points to the Discord message URL.

6. **Bot Detection**: Use `.Message.Author.Bot` or `.BotUser.ID` to detect bot messages.

---

## Migration Tips from YAGPDB

| YAGPDB | QFT Equivalent | Notes |
|--------|----------------|-------|
| `(dbGet userID "key")` | `dbGet "key"` | Auto-scoped per guild |
| `(dbSet userID "key" val)` | `dbSet "key" val` | Auto-scoped per guild |
| `(toInt64 .Channel.ID)` | `.Channel.ID` | Already a string, toInt64 is a no-op |
| `sendMessageRetID` | `sendMessageNoEscapeRetID` | Same function |
| `.Message.Link` | `.Message.Link` | ✅ Supported |
| `.Reaction` | `.Reaction` | ✅ Supported |
| `.ReactionMessage` | `.ReactionMessage` | ✅ Supported |

---

## Testing Your Commands

1. Create a custom command in the dashboard
2. Set trigger type to `reaction`
3. Set event type to `both` (or `added`/`removed`)
4. Optionally specify emoji (leave blank to match all)
5. Paste your template code
6. Save and test by reacting to messages in Discord

---

For more template functions, see the main QFT Template Engine documentation.
