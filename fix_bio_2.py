import re

with open('./components/explore/ExploreFeed.tsx', 'r') as f:
    content = f.read()

# Remove the floating bio from the image container completely.
bio_floating_block = """                   {activeProfile.bio && (
                       <p className="text-xl font-medium text-slate-200 leading-relaxed tracking-wide drop-shadow-lg line-clamp-3">
                           {activeProfile.bio}
                       </p>
                   )}"""

content = content.replace(bio_floating_block, "")

# The prompt asks: "Map the bio strictly to prompt_1_q, prompt_1_a, etc. Absolutely zero hardcoded placeholders like 'I describe myself as fun'."
# Let's verify what prompts look like right now in the Deep Sheet.
