#!/bin/sh

USERID="$1"
TrackID="$2"
ClientIp=`curl -s ifconfig.me`

curl \
	-s \
	--data-urlencode "API=TrackV2" \
	--data-urlencode "XML=<TrackFieldRequest USERID=\"$USERID\"><Revision>1</Revision><ClientIp>$ClientIp</ClientIp><SourceId>arch</SourceId><TrackID ID=\"$TrackID\"/></TrackFieldRequest>" \
	https://secure.shippingapis.com/ShippingAPI.dll \
> res.xml
