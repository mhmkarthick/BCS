import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { statusMeta } from '../../data/labels';
import type { StatusEvent } from '../../types';
import { fmtStamp } from '../../utils/format';
import { colors, fontFamily, fontSize } from '../../theme';

/** Vertical status history timeline — newest event first. */
export function OrderTimeline({ events }: { events: StatusEvent[] }) {
  const list = [...events].reverse();

  return (
    <View>
      {list.map((e, i) => (
        <View
          key={`${e.status}-${e.at}-${i}`}
          style={[styles.row, i === list.length - 1 ? styles.rowLast : null]}
        >
          {i < list.length - 1 ? <View style={styles.rail} /> : null}
          <View style={styles.dotWrap}>
            {i === 0 ? <View style={styles.ring} /> : null}
            <View
              style={[styles.dot, { backgroundColor: statusMeta[e.status].dot }]}
            />
          </View>
          <View style={styles.body}>
            <Text
              style={[
                styles.title,
                i === 0 ? styles.titleLatest : null,
              ]}
            >
              {statusMeta[e.status].label}
            </Text>
            <Text style={styles.time}>{fmtStamp(e.at)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 20,
  },
  rowLast: {
    paddingBottom: 0,
  },
  rail: {
    position: 'absolute',
    left: 5,
    top: 16,
    bottom: 0,
    width: 1,
    backgroundColor: colors.line,
  },
  dotWrap: {
    width: 11,
    height: 11,
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: colors.peachSoft,
  },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  body: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['md+'],
    color: colors.cocoaSoft,
  },
  titleLatest: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    color: colors.cocoa,
  },
  time: {
    marginTop: 2,
    fontFamily: fontFamily.sans,
    fontSize: fontSize['sm+'],
    color: colors.mute,
  },
});
