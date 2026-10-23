import re

with open('./components/chat/ChatInterface.tsx', 'r') as f:
    content = f.read()

# Make sure it's using lowercase check `.toLowerCase() === 'premium'`
content = content.replace(
    'subscriptionTier?.toUpperCase() === \'PREMIUM\'',
    'subscriptionTier?.toLowerCase() === \'premium\''
)
content = content.replace(
    'currentOtherUserProfile.tier?.toUpperCase() === \'PREMIUM\'',
    'currentOtherUserProfile.tier?.toLowerCase() === \'premium\''
)
content = content.replace(
    'currentUserProfile.tier?.toUpperCase() === \'PREMIUM\'',
    'currentUserProfile.tier?.toLowerCase() === \'premium\''
)
content = content.replace(
    'subscriptionTier?.toUpperCase() === \'PRO\'',
    'subscriptionTier?.toLowerCase() === \'pro\''
)
content = content.replace(
    'currentOtherUserProfile.tier?.toUpperCase() === \'PRO\'',
    'currentOtherUserProfile.tier?.toLowerCase() === \'pro\''
)

with open('./components/chat/ChatInterface.tsx', 'w') as f:
    f.write(content)


with open('./components/chat/ChatList.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'u.tier?.toUpperCase() === \'PREMIUM\'',
    'u.tier?.toLowerCase() === \'premium\''
)
content = content.replace(
    'u.tier?.toUpperCase() === \'PRO\'',
    'u.tier?.toLowerCase() === \'pro\''
)

with open('./components/chat/ChatList.tsx', 'w') as f:
    f.write(content)
