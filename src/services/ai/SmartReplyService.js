// src/services/ai/SmartReplyService.js
export class SmartReplyService {
  static quickReplies = [
    "👍", "👎", "😊", "Thanks!", "Sounds good!", "Ok", "Yes", "No",
    "On my way!", "Running late", "Almost there", "Can't make it",
    "Will do", "Got it", "Sure thing", "No problem", "You're welcome"
  ];

  static async suggestReplies(lastMessage, conversationContext = []) {
    const suggestions = [];
    const messageText = lastMessage.toLowerCase();

    // Question detection
    if (messageText.includes('?') || 
        messageText.includes('when') || 
        messageText.includes('where') || 
        messageText.includes('what') || 
        messageText.includes('how')) {
      suggestions.push("Let me check", "I'll get back to you", "Not sure");
    }

    // Thank you detection
    if (messageText.includes('thank') || messageText.includes('thanks')) {
      suggestions.push("You're welcome", "No problem", "Anytime! 😊");
    }

    // Meeting/time related
    if (messageText.includes('meeting') || 
        messageText.includes('lunch') || 
        messageText.includes('dinner')) {
      suggestions.push("Sounds good!", "What time?", "Where?");
    }

    // Location related
    if (messageText.includes('where') || messageText.includes('location')) {
      suggestions.push("On my way!", "Almost there", "Running late");
    }

    // Agreement/disagreement
    if (messageText.includes('agree') || messageText.includes('think')) {
      suggestions.push("I agree", "Good point", "I think so too");
    }

    // Default suggestions if no specific context
    if (suggestions.length === 0) {
      suggestions.push("👍", "Thanks!", "Got it");
    }

    return suggestions.slice(0, 3); // Return max 3 suggestions
  }

  static async getEmoticonSuggestions(messageText) {
    const text = messageText.toLowerCase();
    const emoticons = [];

    if (text.includes('good') || text.includes('great') || text.includes('awesome')) {
      emoticons.push("😊", "👍", "🎉");
    } else if (text.includes('bad') || text.includes('sorry') || text.includes('sad')) {
      emoticons.push("😔", "😢", "🙁");
    } else if (text.includes('funny') || text.includes('lol') || text.includes('haha')) {
      emoticons.push("😂", "🤣", "😄");
    } else if (text.includes('love') || text.includes('heart')) {
      emoticons.push("❤️", "😍", "🥰");
    } else {
      emoticons.push("😊", "👍", "🙂");
    }

    return emoticons.slice(0, 3);
  }

  static detectMessageType(messageText) {
    const text = messageText.toLowerCase();
    
    if (text.includes('?')) return 'question';
    if (text.includes('!')) return 'exclamation';
    if (text.includes('thank')) return 'gratitude';
    if (text.includes('sorry')) return 'apology';
    if (text.match(/\d{1,2}:\d{2}/) || text.includes('time')) return 'time_related';
    
    return 'general';
  }
}