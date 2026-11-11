const fs = require('fs');

const path = 'components/chat/GiftModal.tsx';
let content = fs.readFileSync(path, 'utf8');

// Need to pass Authorization header and update handling to expect giftCost from server
content = content.replace(
  /const response = await fetch\('\/api\/chat\/gift', \{[\s\S]*?body: JSON\.stringify\(\{/m,
  `const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/chat/gift', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${session?.access_token}\`
        },
        body: JSON.stringify({`
);

content = content.replace(
  /const updatedGift = \{ \.\.\.gift, messageId: data\.messageId \};/m,
  "const updatedGift = { ...gift, messageId: data.messageId, cost: data.giftCost || gift.cost };"
);

fs.writeFileSync(path, content);
console.log("Fixed GiftModal.tsx headers");
