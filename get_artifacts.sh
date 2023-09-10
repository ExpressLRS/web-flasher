#!/bin/bash
mkdir -p firmware
cd firmware
curl -L -o index.json https://artifactory.expresslrs.org/ExpressLRS/index.json
for i in `cat index.json | jq '.tags | keys[]' | sed 's/"//g' | sort -r` ; do
    HASH=`grep \"$i\" index.json | sed 's/.* "//' | sed 's/".*//'`
    curl -L -o firmware.zip "https://artifactory.expresslrs.org/ExpressLRS/$HASH/firmware.zip"
    mkdir $HASH
    cd $HASH
    unzip -q ../firmware.zip
    mv firmware/* .
    rmdir firmware
    cd ..
    rm firmware.zip
done
