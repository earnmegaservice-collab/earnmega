const fs = require('fs');

const path = 'components/chat/GiftModal.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /const { error: deductError } = GOD_MODE \? \{ error: null \} : await supabase\.rpc\('deduct_coins', \{\s*user_uuid: user\.id,\s*deduct_amount: gift\.cost,\s*\}\);[\s\S]*?if \(notifError\) \{\s*console\.error\('Failed to insert gift notification:', notifError\);\s*\}/,
  `
      const response = await fetch('/api/chat/gift', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          senderId: user.id,
          receiverId: recipientId,
          giftId: gift.id,
          giftName: gift.name,
          giftCost: gift.cost
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send gift');
      }

      const updatedGift = { ...gift, messageId: data.messageId };
  `
);

content = content.replace(
  /setBalance\(prev => Math\.max\(0, prev - gift\.cost\)\);\s*onGiftSent\(gift\);/,
  `// Balance is handled server-side now and will update via Realtime if set up. But we update optimisticly if we want, but server sync is better.
      // Or we let WalletContext handle it
      onGiftSent(updatedGift);`
);

fs.writeFileSync(path, content);
console.log("Updated components/chat/GiftModal.tsx");
