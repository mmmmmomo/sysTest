#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "1. Registering user..."
curl -s -X POST $BASE_URL/auth/register -H "Content-Type: application/json" -d '{"username":"curl_user","password":"password"}'
echo -e "\n"

echo "2. Logging in..."
TOKEN=$(curl -s -X POST $BASE_URL/auth/login -H "Content-Type: application/json" -d '{"username":"curl_user","password":"password"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token: $TOKEN"

if [ -z "$TOKEN" ]; then
    echo "Login failed"
    exit 1
fi

echo "3. Creating dummy file..."
echo "Hello World" > dummy.txt

echo "4. Uploading file..."
curl -s -X POST $BASE_URL/files/upload -H "Authorization: Bearer $TOKEN" -F "file=@dummy.txt"
echo -e "\n"

echo "5. Listing files (User)..."
curl -s -X GET $BASE_URL/files -H "Authorization: Bearer $TOKEN"
echo -e "\n"

echo "6. Logging in as Admin..."
ADMIN_TOKEN=$(curl -s -X POST $BASE_URL/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Admin Token: $ADMIN_TOKEN"

echo "7. Listing files (Admin)..."
FILES_JSON=$(curl -s -X GET $BASE_URL/files -H "Authorization: Bearer $ADMIN_TOKEN")
echo $FILES_JSON
echo -e "\n"

# Extract file path
FILE_PATH=$(echo $FILES_JSON | grep -o '"path":"[^"]*"' | cut -d'"' -f4)
echo "File path: $FILE_PATH"

echo "8. Deleting user (Admin)..."
# First get user ID. Assuming it's 2 since admin is 1.
# Or fetch users list.
USERS=$(curl -s -X GET $BASE_URL/admin/users -H "Authorization: Bearer $ADMIN_TOKEN")
echo "Users: $USERS"
USER_ID=$(echo $USERS | grep -o '"id":[0-9]*,"username":"curl_user"' | grep -o '[0-9]*' | head -1)
echo "User ID to delete: $USER_ID"

if [ ! -z "$USER_ID" ]; then
    curl -s -X DELETE $BASE_URL/admin/users/$USER_ID -H "Authorization: Bearer $ADMIN_TOKEN"
    echo -e "\nUser deleted."
    
    if [ -f "$FILE_PATH" ]; then
        echo "FAILURE: File still exists at $FILE_PATH"
    else
        echo "SUCCESS: File deleted from disk."
    fi
else
    echo "User not found in list."
fi

rm dummy.txt
