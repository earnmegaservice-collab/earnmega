with open("components/chat/ChatInterface.tsx", "r") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "Failed to get media stream or accept call" in line:
        print(f"Line {i+1}: {line.strip()}")
        # print 10 lines before and after
        for j in range(max(0, i-10), min(len(lines), i+11)):
            print(f"{j+1}: {lines[j].strip()}")
