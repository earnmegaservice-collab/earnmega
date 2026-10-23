import re

with open('./components/explore/ExploreFeed.tsx', 'r') as f:
    content = f.read()

# I need to map `bio` into the first prompt if it exists, or just ensure no hardcoded prompts.
# Wait, what if there's no prompt_1_a but there is a bio?
# We should map bio to prompt_1_q="About me" and prompt_1_a={bio} if they are not explicitly set as prompts.
# The user said: "Map the bio strictly to prompt_1_q, prompt_1_a, etc. Absolutely zero hardcoded placeholders like 'I describe myself as fun'."

# If there is a bio but no prompt_1_a, we use it. If there is a bio, maybe that is the prompt_1_a?
# Let's map bio to prompt_1_a logic inside the render.
# Let's replace the first prompt render block to map `bio` if `prompt_1_a` is missing but `bio` exists, or just use bio.

prompt1_logic = """                    {/* The Interview Cards */}
                    {(activeProfile.prompt_1_a || activeProfile.bio) && (
                      <div className="bg-gradient-to-br from-white/10 to-transparent border border-white/15 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={60}/></div>
                        <span className="text-sm font-bold text-gray-400 mb-2 block">{activeProfile.prompt_1_q || 'About me'}</span>
                        <p className="text-3xl font-black text-white leading-tight tracking-tight">
                          {activeProfile.prompt_1_a || activeProfile.bio}
                        </p>
                      </div>
                    )}"""

content = re.sub(
    r'\{\/\* The Interview Cards \*\/\}\s*\{activeProfile\.prompt_1_a && \(\s*<div className="bg-gradient-to-br from-white\/10 to-transparent border border-white\/15 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl relative overflow-hidden">\s*<div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size=\{60\}\/><\/div>\s*<span className="text-sm font-bold text-gray-400 mb-2 block">\{activeProfile\.prompt_1_q\}<\/span>\s*<p className="text-3xl font-black text-white leading-tight tracking-tight">\s*\{activeProfile\.prompt_1_a\}\s*<\/p>\s*<\/div>\s*\)\}',
    prompt1_logic,
    content
)

with open('./components/explore/ExploreFeed.tsx', 'w') as f:
    f.write(content)
