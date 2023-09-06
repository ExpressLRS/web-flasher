#!/bin/bash
mkdir -p firmware
cd firmware
curl -L -o index.json https://artifactory.expresslrs.org/ExpressLRS/index.json
for i in `cat index.json | jq '.tags | keys[]' | grep -v -- -RC | sed 's/"//g' | sort -r` ; do
    HASH=`grep \"$i\" index.json | sed 's/.* "//' | sed 's/".*//'`
    curl -L -o firmware.zip "https://artifactory.expresslrs.org/ExpressLRS/$HASH/firmware.zip"
    unzip firmware.zip
    rm firmware.zip
    mv firmware $i
    VERSIONS=$VERSIONS", '$i'"
done
rm -f index.json
VERSIONS=`echo $VERSIONS|sed 's/, //'`
sed -i~ "s/\'@VERSIONS@\'/$VERSIONS/" ../src/js/index.js
rm ../src/js/index.js~