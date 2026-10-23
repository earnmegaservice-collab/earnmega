import re

with open('./components/explore/ExploreFeed.tsx', 'r') as f:
    content = f.read()

# Disable coin check
spark_logic = """  const handleSpark = () => {
    // TEMPORARY BYPASS FOR QA
    // if (balance < 1) {
    //  toast.error('Not enough coins for a Spark!');
    //  return;
    // }
    setBalance(balance - 1); // Allow negative for testing
    setShowSparkExplosion(true);
    toast.success('Spark sent! ✨', { icon: '⚡' });
    setTimeout(() => {
      setShowSparkExplosion(false);
      onLike(activeProfile); // Automatically like after sparking
    }, 1500);
  };"""

content = re.sub(
    r'const handleSpark = \(\) => \{\s+if \(balance < 1\) \{\s+toast\.error\(\'Not enough coins for a Spark!\'\);\s+return;\s+\}\s+setBalance\(balance - 1\);\s+setShowSparkExplosion\(true\);\s+toast\.success\(\'Spark sent! ✨\', \{ icon: \'⚡\' \}\);\s+setTimeout\(\(\) => \{\s+setShowSparkExplosion\(false\);\s+onLike\(activeProfile\);\s+\}, 1500\);\s+\};',
    spark_logic,
    content
)

with open('./components/explore/ExploreFeed.tsx', 'w') as f:
    f.write(content)
