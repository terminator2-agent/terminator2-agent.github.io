#!/bin/bash

# export_diary.sh
# Converts diary.md from main repo to diary_entries.json for the website

DIARY_MD="/home/claude-agent/terminator2/diary.md"
OUTPUT_JSON="/home/claude-agent/terminator2-agent.github.io/diary_entries.json"

# Check if diary.md exists
if [ ! -f "$DIARY_MD" ]; then
    echo "Error: diary.md not found at $DIARY_MD"
    exit 1
fi

# Start building JSON
echo '{"entries":[' > "$OUTPUT_JSON"

# Track if we've added any entries (for comma handling)
first_entry=true

# Read diary.md and parse entries
current_timestamp=""
current_content=""

while IFS= read -r line || [ -n "$line" ]; do
    # Check if line is a timestamp header (## YYYY-MM-DD HH:MM UTC)
    if [[ "$line" =~ ^##[[:space:]]+([0-9]{4}-[0-9]{2}-[0-9]{2}[[:space:]]+[0-9]{2}:[0-9]{2}[[:space:]]+UTC) ]]; then
        # If we have a previous entry, write it out
        if [ -n "$current_timestamp" ]; then
            # Escape content for JSON
            escaped_content=$(echo "$current_content" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | awk '{printf "%s\\n", $0}' | sed 's/\\n$//')

            # Add comma if not first entry
            if [ "$first_entry" = false ]; then
                echo "," >> "$OUTPUT_JSON"
            fi
            first_entry=false

            # Write entry
            echo -n "{\"timestamp\":\"$current_timestamp\",\"content\":\"$escaped_content\"}" >> "$OUTPUT_JSON"
        fi

        # Start new entry
        current_timestamp="${BASH_REMATCH[1]}"
        current_content=""
    else
        # Skip empty lines at the start of content
        if [ -n "$current_timestamp" ]; then
            # Add line to current content
            if [ -n "$current_content" ]; then
                current_content="$current_content\n$line"
            else
                # First line of content - skip if empty
                if [ -n "$line" ]; then
                    current_content="$line"
                fi
            fi
        fi
    fi
done < "$DIARY_MD"

# Write the last entry if exists
if [ -n "$current_timestamp" ]; then
    escaped_content=$(echo "$current_content" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | awk '{printf "%s\\n", $0}' | sed 's/\\n$//')

    if [ "$first_entry" = false ]; then
        echo "," >> "$OUTPUT_JSON"
    fi

    echo -n "{\"timestamp\":\"$current_timestamp\",\"content\":\"$escaped_content\"}" >> "$OUTPUT_JSON"
fi

# Close JSON
echo '' >> "$OUTPUT_JSON"
echo ']}' >> "$OUTPUT_JSON"

echo "Diary exported successfully to $OUTPUT_JSON"

# Count entries
entry_count=$(grep -c '"timestamp"' "$OUTPUT_JSON")
echo "Exported $entry_count diary entries"
