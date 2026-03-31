#!/usr/bin/env bash

curl -s -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": 1,
    "contact": {
      "email": "jane.doe@acme.com",
      "firstName": "Jane",
      "lastName": "Doe",
      "companyName": "Acme Corp"
    }
  }' | jq .
