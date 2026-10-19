import re

with open('components/profile/SpatialPhotoStudio.tsx', 'r') as f:
    content = f.read()

# Fix 2: 6-PHOTO GRID CRASH (Android Memory Fix)

# Remove capture attr from inputs
content = re.sub(
    r'<input(.*?) capture="[^"]*"(.*?)\s*/>',
    r'<input\1\2 />',
    content
)

# In handleCameraCapture and handleBulkSelect, remove capture if exists
content = re.sub(
    r'<input id="bulk-input" type="file" multiple accept="image/\*" (capture="[^"]*"\s*)?className="hidden" onChange=\{handleBulkSelect\} />',
    r'<input id="bulk-input" type="file" multiple accept="image/*" className="hidden" onChange={handleBulkSelect} />',
    content
)

content = re.sub(
    r'<input id="camera-input" type="file" accept="image/\*" (capture="[^"]*"\s*)?className="hidden" onChange=\{handleCameraCapture\} />',
    r'<input id="camera-input" type="file" accept="image/*" className="hidden" onChange={handleCameraCapture} />',
    content
)

with open('components/profile/SpatialPhotoStudio.tsx', 'w') as f:
    f.write(content)
