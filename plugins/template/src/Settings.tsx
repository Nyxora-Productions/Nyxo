import { ReactNative, React } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import Header from "./components/Header";
import BetterTableRowGroup from "./components/BetterTableRowGroup";
import { Forms as UiForms } from "@vendetta/ui/components";
import { semanticColors } from "@vendetta/ui";
import { getAssetIDByName } from "@vendetta/ui/assets";

const { ScrollView, View, Text, TextInput, Animated, Easing, Image } = ReactNative;
const Forms = UiForms || {};
const { FormRow } = Forms as any;

if (!Array.isArray(storage.words) || storage.words.length !== 10) {
  storage.words = Array(10).fill("");
}

if (typeof storage.eventGiveawayPing !== "string") {
  storage.eventGiveawayPing = "";
}

const inputStyle = {
  backgroundColor: "#222",
  color: "#fff",
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
  borderWidth: 2,
  borderColor: "#333",
};

const messageHeaderIcon = getAssetIDByName("ic_information_24px");
const raidHeaderIcon = getAssetIDByName("SlashBoxIcon");
const massPingHeaderIcon = getAssetIDByName("SlashBoxIcon");
const aiHeaderIcon = getAssetIDByName("ic_activity_24px");
const arrowForwardIcon = getAssetIDByName("ic_arrow_forward_24px");
const arrowBackIcon = getAssetIDByName("ic_arrow_back_24px");

export default function Settings() {
  useProxy(storage);

  const [selectedPage, setSelectedPage] = React.useState<"main" | "raidMessages">("main");
  const [containerWidth, setContainerWidth] = React.useState(0);
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const scrollRef = React.useRef<any>(null);

  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: selectedPage === "raidMessages" ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [selectedPage, slideAnim]);

  const translateX =
    containerWidth > 0
      ? slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -containerWidth],
        })
      : 0;

  const renderMainPage = () => (
    <>
      <Header />

      <BetterTableRowGroup title="Information" icon={messageHeaderIcon} padding>
        <Text style={{ color: "#aaa" }}>
          Commands: /gemini, /math, /serverinfo, /coinflip, /mcs, /msp, /nuke, /raid, /purge, /userid, /lockdown, /fetchprofile
        </Text>
      </BetterTableRowGroup>

      <BetterTableRowGroup title="Gemini AI Configuration" icon={aiHeaderIcon} padding>
        <Text style={{ color: "#fff", marginBottom: 8 }}>Google API Key</Text>
        <TextInput
          secureTextEntry
          placeholder="Paste your API key here..."
          placeholderTextColor="#666"
          value={storage.geminiKey}
          onChangeText={(v) => (storage.geminiKey = v)}
          style={inputStyle}
        />
      </BetterTableRowGroup>

      <BetterTableRowGroup title="Mass Ping List" icon={massPingHeaderIcon} padding>
        <TextInput
          multiline
          value={storage.eventGiveawayPing}
          onChangeText={(v) => (storage.eventGiveawayPing = v)}
          style={{ ...inputStyle, minHeight: 100 }}
        />
      </BetterTableRowGroup>

      {FormRow && (
        <FormRow
          label="Edit Raid Messages"
          trailing={
            <Image
              source={arrowForwardIcon}
              style={{ width: 24, height: 24, tintColor: semanticColors.TEXT_MUTED }}
            />
          }
          onPress={() => setSelectedPage("raidMessages")}
        />
      )}
    </>
  );

  const renderRaidMessagesPage = () => (
    <>
      <Header />
      <BetterTableRowGroup title="Raid Messages" icon={raidHeaderIcon} padding>
        {[...Array(10).keys()].map((i) => (
          <View key={i} style={{ marginBottom: 12 }}>
            <Text style={{ color: "#fff", marginBottom: 6 }}>Message {i + 1}</Text>
            <TextInput
              style={inputStyle}
              value={storage.words[i]}
              onChangeText={(v) => (storage.words[i] = v)}
            />
          </View>
        ))}
      </BetterTableRowGroup>
      <View style={{ height: 20 }} />
      {FormRow && (
        <FormRow
          label="Back"
          trailing={
            <Image
              source={arrowBackIcon}
              style={{ width: 24, height: 24, tintColor: semanticColors.TEXT_MUTED }}
            />
          }
          onPress={() => setSelectedPage("main")}
        />
      )}
      <View style={{ height: 60 }} />
    </>
  );

  return (
    <View
      style={{ flex: 1 }}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <ScrollView ref={scrollRef} style={{ flex: 1 }}>
        <Animated.View
          style={{
            flexDirection: "row",
            width: containerWidth > 0 ? containerWidth * 2 : "200%",
            transform: [{ translateX }],
          }}
        >
          <View style={{ width: containerWidth || "100%" }}>{renderMainPage()}</View>
          <View style={{ width: containerWidth || "100%" }}>{renderRaidMessagesPage()}</View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
