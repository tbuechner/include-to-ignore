#!/bin/bash

# Exit on error
set -e

echo "Creating test directory structure..."
# Create and enter test directory
rm -rf test-include-to-ignore
mkdir -p test-include-to-ignore/src/components/{auth,utils}
mkdir -p test-include-to-ignore/docs
mkdir -p test-include-to-ignore/tests
cd test-include-to-ignore

echo "Creating test files..."
# Create dummy files
touch src/index.ts
touch src/components/auth/login.ts
touch src/components/auth/register.ts
touch src/components/utils/helpers.ts
touch docs/readme.md
touch tests/test1.ts
touch tests/test2.ts

echo "Creating include patterns file..."
# Create include patterns file
cat > include.txt << EOL
+/src/components/auth
+/src/index.ts
+/docs/
EOL

echo "Running include-to-ignore tool..."
# Run the tool (try both methods)
if [ -x "../dist/index.js" ]; then
    ../dist/index.js -i include.txt -o .gitignore
else
    node ../dist/index.js -i include.txt -o .gitignore
fi

echo "Setting up git repository for testing..."
# Initialize git repository for testing
git init > /dev/null 2>&1
git add .

echo -e "\nGenerated .gitignore content:"
echo "--------------------------------"
cat .gitignore
echo "--------------------------------"

echo -e "\nFiles that would be committed:"
echo "--------------------------------"
git status --porcelain | grep -v '^??' | cut -c4-
echo "--------------------------------"

echo -e "\nTest complete! Check the results above."