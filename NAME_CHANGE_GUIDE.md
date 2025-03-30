# How to Change the Project Name

To change the project name, update it in these locations:

1. In `index.html`:
   - Find the `<title>` tag in the `<head>` section
   - Change the text between the tags to your new name
   - Example: `<title>Your New Name</title>`

2. In `package.json`:
   - Find the "name" field at the top of the file
   - Change it to your new name (use kebab-case)
   - Example: `"name": "your-new-name"`

Note: The package name (in package.json) should be lowercase, and can only contain:
- Lowercase letters
- Numbers
- Hyphens (-) or underscores (_)
