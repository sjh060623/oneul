import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const HAS_LAUNCHED_KEY = "APP_HAS_LAUNCHED_V1";
const SLIDES = [
  {
    id: "1",
    emoji: "🚀",
    title: "성장을 위한 시작",
    sub: "당신의 하루를 더 가치 있게 만들어줄게요!",
  },
  {
    id: "2",
    emoji: "🎯",
    title: "매일 5가지 목표",
    sub: "정해진 시간에 오늘의 목표 5개를 세워보세요.\n알림 시간은 '프로필' 탭에서 변경 가능해요.",
  },
  {
    id: "3",
    emoji: "📍",
    title: "도착하면 자동 완료",
    sub: "'~가기' 목표는 지도에서 지정한 장소 근처에\n도착하면 자동으로 알림이 오고 완료 처리돼요.",
  },
  {
    id: "4",
    emoji: "📊",
    title: "쌓여가는 성취감",
    sub: "차곡차곡 달성한 소중한 목표들은\n'기록' 탭에서 언제든지 다시 볼 수 있어요.",
  },
  {
    id: "5",
    emoji: "⚙️",
    title: "위치 권한 설정",
    sub: "원활한 작동을 위해 기기 설정에서\n위치 접근 권한을 '항상'으로 허용해 주세요.",
  },
];

export default function FirstLaunchTutorial() {
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      const hasLaunched = await AsyncStorage.getItem(HAS_LAUNCHED_KEY);
      if (hasLaunched === null) {
        setVisible(true);
      }
    };
    checkFirstLaunch();
  }, []);

  const onComplete = async () => {
    await AsyncStorage.setItem(HAS_LAUNCHED_KEY, "true");
    setVisible(false);
  };

  const handleScroll = (event) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / width);
    setCurrentIndex(index);
  };

  const renderItem = ({ item }) => (
    <View style={styles.slide}>
      <View style={styles.emojiContainer}>
        <Text style={styles.emoji}>{item.emoji}</Text>
      </View>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideSub}>{item.sub}</Text>
    </View>
  );

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        {/*리스트 */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          keyExtractor={(item) => item.id}
          scrollEventThrottle={16}
        />

        {/* 하단 */}
        <View style={styles.footer}>
          {/* 페이지  */}
          <View style={styles.indicatorRow}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  currentIndex === i ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            ))}
          </View>

          {/* 버튼 */}
          <View style={styles.buttonRow}>
            {currentIndex === SLIDES.length - 1 ? (
              <Pressable onPress={onComplete} style={styles.mainBtn}>
                <Text style={styles.mainBtnText}>시작하기</Text>
              </Pressable>
            ) : (
              <View style={styles.hintBox}>
                <Text style={styles.hintText}>옆으로 밀어서 확인</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  slide: {
    width: width,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emojiContainer: {
    width: 160,
    height: 160,
    backgroundColor: "#161616",
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    borderWidth: 1,
    borderColor: "#262626",
  },
  emoji: {
    fontSize: 70,
  },
  slideTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  slideSub: {
    color: "#6f7377",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 26,
  },
  footer: {
    paddingBottom: 60,
    paddingHorizontal: 30,
  },
  indicatorRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 40,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 32, // 현재 위치를 더 강조하기 위해 길이를 늘림
    backgroundColor: "#6366F1", // 인디고 블루 포인트
  },
  inactiveDot: {
    width: 8,
    backgroundColor: "#262626",
  },
  buttonRow: {
    height: 56,
    justifyContent: "center",
  },
  mainBtn: {
    backgroundColor: "#fff",
    height: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#fff",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  mainBtnText: {
    color: "#000",
    fontSize: 17,
    fontWeight: "900",
  },
  hintBox: {
    alignItems: "center",
  },
  hintText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "800",
  },
});
