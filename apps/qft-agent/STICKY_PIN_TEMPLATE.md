# Sticky Pin Custom Command for QFT

This is an adapted version of the YAGPDB sticky pin template for the QFT bot.

## Setup Instructions

1. Create a new custom command in the dashboard
2. Set **Trigger Type** to: `reaction`
3. Set **Reaction Event Type** to: `both` (added & removed)
4. Leave **Emoji** blank (to match any emoji)
5. Paste the template code below into **Command Code**

## QFT Template Code

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

## How It Works

1. **📌 Pin Reaction**: When a user reacts with 📌, the message gets "stickied" in the channel
   - Creates an embed with the message content
   - Adds a 🚫 reaction to allow removal
   - Stores the sticky message ID in the database

2. **🚫 Remove Reaction**: When a user reacts with 🚫 on the bot's sticky message
   - Deletes the sticky embed after 2 seconds
   - Clears the database entry

## Required Context

For this to work with reaction events, you need to ensure the bot's reaction handler passes the correct context. The template expects:

- `.Reaction.Emoji.Name` - The emoji that was reacted
- `.ReactionMessage` - The message that was reacted to
- `.Message` - The message object (same as ReactionMessage)
- `.User` - The user who reacted
- `.Channel` - The channel where the reaction occurred
- `.BotUser` - The bot's user info

## Database Schema

The command stores data in the database with the key pattern:
- **Key**: `[channelId]_Sticky_Pin`
- **Value**: Object with `Pin_Channel`, `Pin_Message`, `Pin_User`, `Sticky_Message`

## Notes

- The sticky message is limited to 1000 characters (truncated with "..." if longer)
- Only non-bot messages can be pinned
- The sticky embed auto-deletes when the 🚫 reaction is used
