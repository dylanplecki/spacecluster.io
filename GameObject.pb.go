// Code generated by protoc-gen-go.
// source: GameObject.proto
// DO NOT EDIT!

package spacecluster

import proto "github.com/golang/protobuf/proto"
import fmt "fmt"
import math "math"

// Reference imports to suppress errors if they are not otherwise used.
var _ = proto.Marshal
var _ = fmt.Errorf
var _ = math.Inf

type GameObjState struct {
	XPos             *uint32  `protobuf:"varint,1,req,name=XPos,json=xPos" json:"XPos,omitempty"`
	YPos             *uint32  `protobuf:"varint,2,req,name=YPos,json=yPos" json:"YPos,omitempty"`
	Size             *uint32  `protobuf:"varint,3,req,name=Size,json=size" json:"Size,omitempty"`
	Velocity         *float32 `protobuf:"fixed32,4,req,name=Velocity,json=velocity" json:"Velocity,omitempty"`
	Azimuth          *float32 `protobuf:"fixed32,5,req,name=Azimuth,json=azimuth" json:"Azimuth,omitempty"`
	XXX_unrecognized []byte   `json:"-"`
}

func (m *GameObjState) Reset()                    { *m = GameObjState{} }
func (m *GameObjState) String() string            { return proto.CompactTextString(m) }
func (*GameObjState) ProtoMessage()               {}
func (*GameObjState) Descriptor() ([]byte, []int) { return fileDescriptor2, []int{0} }

func (m *GameObjState) GetXPos() uint32 {
	if m != nil && m.XPos != nil {
		return *m.XPos
	}
	return 0
}

func (m *GameObjState) GetYPos() uint32 {
	if m != nil && m.YPos != nil {
		return *m.YPos
	}
	return 0
}

func (m *GameObjState) GetSize() uint32 {
	if m != nil && m.Size != nil {
		return *m.Size
	}
	return 0
}

func (m *GameObjState) GetVelocity() float32 {
	if m != nil && m.Velocity != nil {
		return *m.Velocity
	}
	return 0
}

func (m *GameObjState) GetAzimuth() float32 {
	if m != nil && m.Azimuth != nil {
		return *m.Azimuth
	}
	return 0
}

type GameObjUpdate struct {
	Tick             *uint64       `protobuf:"varint,1,req,name=Tick,json=tick" json:"Tick,omitempty"`
	ObjId            *string       `protobuf:"bytes,2,req,name=ObjId,json=objId" json:"ObjId,omitempty"`
	ObjState         *GameObjState `protobuf:"bytes,3,req,name=ObjState,json=objState" json:"ObjState,omitempty"`
	XXX_unrecognized []byte        `json:"-"`
}

func (m *GameObjUpdate) Reset()                    { *m = GameObjUpdate{} }
func (m *GameObjUpdate) String() string            { return proto.CompactTextString(m) }
func (*GameObjUpdate) ProtoMessage()               {}
func (*GameObjUpdate) Descriptor() ([]byte, []int) { return fileDescriptor2, []int{1} }

func (m *GameObjUpdate) GetTick() uint64 {
	if m != nil && m.Tick != nil {
		return *m.Tick
	}
	return 0
}

func (m *GameObjUpdate) GetObjId() string {
	if m != nil && m.ObjId != nil {
		return *m.ObjId
	}
	return ""
}

func (m *GameObjUpdate) GetObjState() *GameObjState {
	if m != nil {
		return m.ObjState
	}
	return nil
}

func init() {
	proto.RegisterType((*GameObjState)(nil), "spacecluster.GameObjState")
	proto.RegisterType((*GameObjUpdate)(nil), "spacecluster.GameObjUpdate")
}

var fileDescriptor2 = []byte{
	// 210 bytes of a gzipped FileDescriptorProto
	0x1f, 0x8b, 0x08, 0x00, 0x00, 0x09, 0x6e, 0x88, 0x02, 0xff, 0x4c, 0x8f, 0x31, 0x4f, 0x85, 0x30,
	0x14, 0x85, 0xf3, 0xb0, 0x84, 0x7a, 0x85, 0xc4, 0x34, 0x0e, 0x0d, 0x93, 0x61, 0x72, 0x62, 0x70,
	0x70, 0x77, 0x32, 0x4e, 0x9a, 0xa2, 0x46, 0xc7, 0x5a, 0x9a, 0x58, 0x85, 0x14, 0xe9, 0xc5, 0x08,
	0x93, 0x3f, 0xdd, 0x52, 0xfa, 0x12, 0xb6, 0x73, 0xbe, 0x7b, 0x87, 0xef, 0xc0, 0xf9, 0x9d, 0xec,
	0xf5, 0xc3, 0xfb, 0xa7, 0x56, 0x58, 0x0f, 0xa3, 0x45, 0xcb, 0x72, 0x37, 0x48, 0xa5, 0x55, 0x37,
	0x39, 0xd4, 0x63, 0xf5, 0x77, 0x80, 0x3c, 0xbe, 0x34, 0x28, 0x51, 0x33, 0x06, 0xe4, 0xf5, 0xd1,
	0x3a, 0x7e, 0xb8, 0x4c, 0xae, 0x0a, 0x41, 0x7e, 0x7d, 0x5e, 0xd9, 0xdb, 0xca, 0x92, 0x8d, 0xcd,
	0x91, 0x35, 0x66, 0xd1, 0xfc, 0x64, 0x63, 0xce, 0x67, 0x56, 0x02, 0x7d, 0xd1, 0x9d, 0x55, 0x06,
	0x67, 0x4e, 0x3c, 0x4f, 0x04, 0xfd, 0x89, 0x9d, 0x71, 0xc8, 0x6e, 0x17, 0xd3, 0x4f, 0xf8, 0xc1,
	0xd3, 0x70, 0xca, 0xe4, 0x56, 0xab, 0x6f, 0x28, 0xa2, 0xc1, 0xf3, 0xd0, 0x46, 0x85, 0x27, 0xa3,
	0xbe, 0x82, 0x02, 0x11, 0x04, 0x7d, 0x66, 0x17, 0x90, 0xfa, 0x87, 0xfb, 0x36, 0x38, 0x9c, 0x8a,
	0xd4, 0xae, 0x85, 0xdd, 0x00, 0x3d, 0x8a, 0x07, 0x91, 0xb3, 0xeb, 0xb2, 0xde, 0xcf, 0xab, 0xf7,
	0xd3, 0x04, 0xb5, 0x31, 0xfd, 0x07, 0x00, 0x00, 0xff, 0xff, 0xd9, 0xaf, 0x04, 0x9f, 0x16, 0x01,
	0x00, 0x00,
}