#!/bin/bash

# Remove old firmware files
rm -rf firmware backpack

# Download main ELRS firmware, for each tagged version
mkdir -p firmware
cd firmware
curl -L -o index.json https://artifactory.expresslrs.org/ExpressLRS/index.json
for HASH in `cat index.json | jq '.tags,.branches | values[]' | sed 's/"//g' | sort -r` ; do
    curl -L -o firmware.zip "https://artifactory.expresslrs.org/ExpressLRS/$HASH/firmware.zip"
    mkdir $HASH
    cd $HASH
    unzip -q ../firmware.zip
    mv firmware/* .
    rm -rf firmware
    cd ..
    rm firmware.zip
done

# Download the published hardware targets into the `firmware` directory
mkdir hardware
cd hardware
curl -L -o hardware.zip https://artifactory.expresslrs.org/ExpressLRS/hardware.zip
unzip -q hardware.zip
rm hardware.zip

# Download backpack firmware, for each tagged version
cd ../..
mkdir -p backpack
cd backpack
curl -L -o index.json https://artifactory.expresslrs.org/Backpack/index.json
for HASH in `cat index.json | jq '.tags,.branches | values[]' | sed 's/"//g' | sort -r` ; do
    curl -L -o firmware.zip "https://artifactory.expresslrs.org/Backpack/$HASH/firmware.zip"
    mkdir $HASH
    cd $HASH
    unzip -q ../firmware.zip
    mv firmware/* .
    rm -rf firmware
    cd ..
    rm firmware.zip
done
