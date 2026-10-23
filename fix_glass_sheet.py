import re

with open('./components/explore/ExploreFeed.tsx', 'r') as f:
    content = f.read()

# Change the background of the bottom sheet
content = content.replace(
    'className="bg-[#111418] rounded-t-[40px] shadow-[0_-30px_90px_rgba(0,0,0,0.9)] mt-[-80px] pt-8 pb-32 px-6 relative z-40"',
    'className="bg-[#050505]/75 backdrop-blur-[50px] shadow-2xl rounded-t-[40px] mt-[-80px] pt-8 pb-32 px-6 relative z-40"'
)

with open('./components/explore/ExploreFeed.tsx', 'w') as f:
    f.write(content)
